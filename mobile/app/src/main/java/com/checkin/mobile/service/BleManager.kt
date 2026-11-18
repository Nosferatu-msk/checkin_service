package com.checkin.mobile.service

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import android.util.Log
import com.checkin.mobile.data.local.BeaconDao
import com.checkin.mobile.data.local.entity.BeaconScanEntity
import com.checkin.mobile.domain.repository.SettingsRepository
import com.checkin.mobile.domain.usecase.attendance.PresenceAlgorithm
import com.checkin.mobile.domain.usecase.attendance.RssiSample
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.altbeacon.beacon.Beacon
import org.altbeacon.beacon.BeaconConsumer
import org.altbeacon.beacon.BeaconManager
import org.altbeacon.beacon.BeaconParser
import org.altbeacon.beacon.Region
import java.util.Date
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BleManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val beaconDao: BeaconDao,
    private val settingsRepository: SettingsRepository,
    private val presenceAlgorithm: PresenceAlgorithm
) : BeaconConsumer {

    companion object {
        private const val TAG = "BleManager"

        // Адаптивное сканирование
        private const val SCAN_DURATION_MS = 3000L      // 3 секунды сканирование
        private const val PAUSE_WITH_BEACONS_MS = 10000L // 10 секунд пауза если маяки найдены
        private const val PAUSE_NO_BEACONS_MS = 0L       // 0 секунд пауза если маяков нет (непрерывно)
        
        // Затухание маяков — скрывать если не видели 30 секунд
        private const val BEACON_TIMEOUT_MS = 30000L // 30 секунд
    }

    private var allowedBeaconUuids: List<String> = emptyList()

    private val beaconManager: BeaconManager by lazy {
        BeaconManager.getInstanceForApplication(context).apply {
            // iBeacon layout
            beaconParsers.add(BeaconParser().setBeaconLayout("m:2-3=0215,i:4-19,i:20-21,i:22-23,p:24-24"))
            // Eddystone-TLM layout
            beaconParsers.add(BeaconParser().setBeaconLayout("x,s:0-1=feaa,m:2-2=20,d:3-3,d:4-5,d:6-7,d:8-11"))
        }
    }

    private val region = Region("AllBeacons", null, null, null)

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _discoveredBeacons = MutableStateFlow<List<Beacon>>(emptyList())
    val discoveredBeacons: StateFlow<List<Beacon>> = _discoveredBeacons.asStateFlow()

    // Aggregation buffer
    private val aggregationBuffer = mutableMapOf<String, MutableList<BeaconReading>>()
    private var aggregationIntervalMs = 10 * 60 * 1000L // 10 minutes

    // Beacon cache with timestamps for "decay" logic
    private data class CachedBeacon(
        val beacon: Beacon,
        val lastSeen: Long
    )
    private val beaconCache = mutableMapOf<String, CachedBeacon>()

    // Duty cycle
    private var dutyCycleHandler: Handler? = null
    private var dutyCycleRunnable: Runnable? = null

    private val scope = CoroutineScope(Dispatchers.IO)

    /**
     * Загрузить whitelist разрешённых UUID маяков из серверных настроек.
     * Следует вызывать при старте приложения и при необходимости обновить список.
     */
    suspend fun loadAllowedBeacons() {
        allowedBeaconUuids = settingsRepository.getAllowedBeaconUuids()
        Log.d(TAG, "Loaded ${allowedBeaconUuids.size} allowed beacon UUIDs")
    }

    fun startScanning() {
        if (!hasRequiredPermissions()) {
            Log.w(TAG, "Missing required BLE permissions")
            return
        }

        // Bind to BeaconManager service if not already bound
        if (!beaconManager.isBound(this)) {
            beaconManager.bind(this)
            Log.d(TAG, "BeaconManager bound to service")
        }

        beaconManager.addRangeNotifier { beacons, region ->
            val currentTime = System.currentTimeMillis()

            // Обновляем кэш найденными маяками
            beacons.forEach { beacon ->
                val beaconId = "${beacon.id1}_${beacon.id2}_${beacon.id3}"

                beaconCache[beaconId] = CachedBeacon(
                    beacon = beacon,
                    lastSeen = currentTime
                )

                Log.d(TAG, "Beacon $beaconId detected, RSSI: ${beacon.rssi}")
            }

            // Не обновляем UI здесь — это делается в startDutyCycle после цикла
        }

        // Запустить duty cycle для экономии батареи
        startDutyCycle()
        _isScanning.value = true
        Log.d(TAG, "Scanning started with duty cycle")
    }

    fun stopScanning() {
        // Остановить duty cycle
        stopDutyCycle()

        beaconManager.stopRangingBeaconsInRegion(region)
        
        // Unbind from BeaconManager service
        if (beaconManager.isBound(this)) {
            beaconManager.unbind(this)
            Log.d(TAG, "BeaconManager unbound from service")
        }
        
        _isScanning.value = false
        _discoveredBeacons.value = emptyList()
        Log.d(TAG, "Scanning stopped")
    }

    /**
     * Запустить адаптивное сканирование:
     * - Если маяки найдены — пауза 10 сек (экономия батареи)
     * - Если маяков нет — непрерывное сканирование (быстрый поиск)
     */
    private fun startDutyCycle() {
        dutyCycleHandler = Handler(Looper.getMainLooper())
        dutyCycleRunnable = object : Runnable {
            override fun run() {
                // Начало цикла сканирования
                beaconManager.startRangingBeaconsInRegion(region)
                Log.d(TAG, "Adaptive scan: scanning started")

                // Через 3 секунды — остановить и обработать результат
                dutyCycleHandler?.postDelayed({
                    beaconManager.stopRangingBeaconsInRegion(region)
                    
                    // Удалить устаревшие маяки из кэша
                    cleanupStaleBeacons()
                    
                    // Обновить UI из кэша
                    updateUIFromCache()

                    // Адаптивная пауза в зависимости от наличия активных маяков
                    val activeBeacons = getActiveBeacons()
                    val pauseDuration = if (activeBeacons.isNotEmpty()) {
                        Log.d(TAG, "Adaptive scan: ${activeBeacons.size} active beacons, pause 10s")
                        PAUSE_WITH_BEACONS_MS
                    } else {
                        Log.d(TAG, "Adaptive scan: no active beacons, continuous scanning")
                        PAUSE_NO_BEACONS_MS
                    }

                    // Запланировать следующий цикл
                    if (pauseDuration > 0) {
                        dutyCycleHandler?.postDelayed(this, pauseDuration)
                    } else {
                        // Непрерывное сканирование — сразу следующий цикл
                        dutyCycleHandler?.post(this)
                    }
                }, SCAN_DURATION_MS)
            }
        }

        dutyCycleHandler?.post(dutyCycleRunnable!!)
    }
    
    /**
     * Удалить устаревшие маяки из кэша (не видели дольше BEACON_TIMEOUT_MS).
     */
    private fun cleanupStaleBeacons() {
        val currentTime = System.currentTimeMillis()
        val keysToRemove = mutableListOf<String>()
        
        beaconCache.forEach { (id, cached) ->
            val age = currentTime - cached.lastSeen
            if (age > BEACON_TIMEOUT_MS) {
                keysToRemove.add(id)
                Log.d(TAG, "Beacon $id removed (stale, age: ${age}ms)")
            }
        }
        
        keysToRemove.forEach { beaconCache.remove(it) }
    }
    
    /**
     * Получить список активных маяков из кэша (не устаревшие).
     */
    private fun getActiveBeacons(): List<Beacon> {
        val currentTime = System.currentTimeMillis()
        return beaconCache.values
            .filter { (currentTime - it.lastSeen) <= BEACON_TIMEOUT_MS }
            .map { it.beacon }
            .toList()
    }
    
    /**
     * Обновить UI из кэша.
     */
    private fun updateUIFromCache() {
        val activeBeacons = getActiveBeacons()
        _discoveredBeacons.value = activeBeacons
        
        if (activeBeacons.isNotEmpty()) {
            Log.d(TAG, "UI updated: ${activeBeacons.size} active beacons, first RSSI: ${activeBeacons.first().rssi}")
        } else {
            Log.d(TAG, "UI updated: no active beacons")
        }
    }

    /**
     * Остановить duty cycle.
     */
    private fun stopDutyCycle() {
        dutyCycleRunnable?.let { dutyCycleHandler?.removeCallbacks(it) }
        dutyCycleRunnable = null
        dutyCycleHandler = null
    }

    /**
     * Фильтрация маяков по whitelist UUID.
     * Если whitelist пуст — пропускаются все маяки (фильтрация отключена).
     */
    private fun filterBeaconsByWhitelist(beacons: List<Beacon>): List<Beacon> {
        if (allowedBeaconUuids.isEmpty()) {
            // Whitelist не загружен или пуст — пропускаем все маяки
            return beacons
        }
        return beacons.filter { beacon ->
            beacon.id1.toString() in allowedBeaconUuids
        }
    }

    private fun aggregateBeacons(beacons: List<Beacon>) {
        val timestamp = System.currentTimeMillis()

        beacons.forEach { beacon ->
            val key = "${beacon.id1}_${beacon.id2}_${beacon.id3}"
            
            if (!aggregationBuffer.containsKey(key)) {
                aggregationBuffer[key] = mutableListOf()
            }

            aggregationBuffer[key]?.add(
                BeaconReading(
                    uuid = beacon.id1.toString(),
                    major = beacon.id2.toInt(),
                    minor = beacon.id3.toInt(),
                    macAddress = beacon.bluetoothAddress,
                    rssi = beacon.rssi,
                    timestamp = timestamp
                )
            )
        }

        // Check if aggregation interval has passed
        checkAndSaveAggregatedData()
    }

    private fun checkAndSaveAggregatedData() {
        val now = System.currentTimeMillis()
        val keysToRemove = mutableListOf<String>()

        aggregationBuffer.forEach { (key, readings) ->
            if (readings.isNotEmpty()) {
                val firstReading = readings.first()
                val elapsed = now - firstReading.timestamp

                if (elapsed >= aggregationIntervalMs) {
                    // Определить присутствие и вычислить медиану RSSI
                    val result = processAggregatedData(readings)

                    if (result != null) {
                        // Присутствие подтверждено — сохранить в БД
                        scope.launch {
                            beaconDao.insertBeaconScan(result)
                        }
                    } else {
                        Log.d(TAG, "Beacon $key: присутствие не подтверждено, пропуск интервала")
                    }

                    keysToRemove.add(key)
                }
            }
        }

        // Remove aggregated entries
        keysToRemove.forEach { aggregationBuffer.remove(it) }
    }

    /**
     * Обработать агрегированные замеры: определить присутствие и вычислить медиану RSSI.
     *
     * @return [BeaconScanEntity] если присутствие подтверждено, null если нет
     */
    private fun processAggregatedData(readings: List<BeaconReading>): BeaconScanEntity? {
        // Конвертировать BeaconReading в RssiSample для алгоритма
        val samples = readings.map { reading ->
            RssiSample(rssi = reading.rssi, timestamp = reading.timestamp)
        }

        // Определить присутствие через алгоритм
        val presenceResult = presenceAlgorithm.evaluate(
            samples = samples,
            intervalMs = aggregationIntervalMs
        )

        if (!presenceResult.isPresent) {
            Log.d(TAG, "Presence not confirmed: ${presenceResult.reason}")
            return null
        }

        Log.d(TAG, "Presence confirmed: ${presenceResult.reason}")

        // Вычислить мин/макс из всех замеров (до фильтрации — для информативности)
        val allRssi = readings.map { it.rssi }

        return BeaconScanEntity(
            beacon_uuid = readings.first().uuid,
            major = readings.first().major,
            minor = readings.first().minor,
            mac_address = readings.first().macAddress,
            scan_timestamp_start = Date(readings.first().timestamp),
            scan_timestamp_end = Date(readings.last().timestamp),
            median_rssi = presenceResult.medianRssi.toFloat(),
            min_rssi = allRssi.minOrNull()?.toFloat() ?: 0f,
            max_rssi = allRssi.maxOrNull()?.toFloat() ?: 0f,
            samples_count = presenceResult.filteredSamplesCount,
            sync_status = "pending"
        )
    }

    private fun hasRequiredPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_SCAN
            ) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    // BeaconConsumer interface
    override fun onBeaconServiceConnect() {
        // Service connected
    }

    override fun getApplicationContext(): Context = context

    override fun unbindService(p0: android.content.ServiceConnection) {
        context.unbindService(p0)
    }

    override fun bindService(p0: Intent, p1: android.content.ServiceConnection, p2: Int): Boolean {
        return context.bindService(p0, p1, p2)
    }

    data class BeaconReading(
        val uuid: String,
        val major: Int,
        val minor: Int,
        val macAddress: String,
        val rssi: Int,
        val timestamp: Long
    )
}
