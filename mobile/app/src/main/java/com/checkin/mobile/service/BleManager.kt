package com.checkin.mobile.service

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.checkin.mobile.data.local.BeaconDao
import com.checkin.mobile.data.local.entity.BeaconScanEntity
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
    private val beaconDao: BeaconDao
) : BeaconConsumer {

    private val beaconManager: BeaconManager by lazy {
        BeaconManager.getInstanceForApplication(context).apply {
            // iBeacon layout
            beaconParsers.add(BeaconParser().setBeaconLayout("m:2-3=0215,i:4-19,i:20-21,i:22-23,p:24-24"))
            // Eddystone-TLM layout
            beaconParsers.add(BeaconParser().setBeaconLayout("x,s:0-1=feaa,m:2-2=20,d:3-3,d:4-5,d:6-7,d:8-11"))
        }
    }

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _discoveredBeacons = MutableStateFlow<List<Beacon>>(emptyList())
    val discoveredBeacons: StateFlow<List<Beacon>> = _discoveredBeacons.asStateFlow()

    // Aggregation buffer
    private val aggregationBuffer = mutableMapOf<String, MutableList<BeaconReading>>()
    private var aggregationIntervalMs = 10 * 60 * 1000L // 10 minutes

    private val scope = CoroutineScope(Dispatchers.IO)

    fun startScanning() {
        if (!hasRequiredPermissions()) {
            return
        }

        beaconManager.addRangeNotifier { beacons, region ->
            if (beacons.isNotEmpty()) {
                val beaconList = beacons.toList()
                _discoveredBeacons.value = beaconList
                
                // Aggregate beacon data
                aggregateBeacons(beaconList)
            }
        }

        beaconManager.startRangingBeaconsInRegion(
            Region("AllBeacons", null, null, null)
        )

        _isScanning.value = true
    }

    fun stopScanning() {
        beaconManager.stopRangingBeaconsInRegion(
            Region("AllBeacons", null, null, null)
        )
        _isScanning.value = false
        _discoveredBeacons.value = emptyList()
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
                    // Aggregate readings
                    val aggregated = aggregateReadings(readings)
                    
                    // Save to database
                    scope.launch {
                        beaconDao.insertBeaconScan(aggregated)
                    }

                    keysToRemove.add(key)
                }
            }
        }

        // Remove aggregated entries
        keysToRemove.forEach { aggregationBuffer.remove(it) }
    }

    private fun aggregateReadings(readings: List<BeaconReading>): BeaconScanEntity {
        val rssiValues = readings.map { it.rssi }.sorted()
        val medianRssi = if (rssiValues.isEmpty()) 0 else rssiValues[rssiValues.size / 2]

        return BeaconScanEntity(
            beacon_uuid = readings.first().uuid,
            major = readings.first().major,
            minor = readings.first().minor,
            mac_address = readings.first().macAddress,
            scan_timestamp_start = Date(readings.first().timestamp),
            scan_timestamp_end = Date(readings.last().timestamp),
            median_rssi = medianRssi.toFloat(),
            min_rssi = rssiValues.minOrNull()?.toFloat() ?: 0f,
            max_rssi = rssiValues.maxOrNull()?.toFloat() ?: 0f,
            samples_count = readings.size,
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
