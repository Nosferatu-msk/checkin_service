package com.checkin.mobile.presentation.screens.scanner

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.domain.model.Beacon
import com.checkin.mobile.service.BleManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ScannerUiState(
    val beacons: List<Beacon> = emptyList(),
    val isScanning: Boolean = false,
    val activeBeaconsCount: Int = 0,
    val currentUserStatus: String = "Не на работе",
    val currentLocation: String = "",
    val lastEntryTime: String? = null,
    val permissionsGranted: Boolean = false
)

@HiltViewModel
class BeaconScannerViewModel @Inject constructor(
    private val bleManager: BleManager
) : ViewModel() {

    companion object {
        private const val TAG = "BeaconScannerVM"
    }

    private val _uiState = MutableStateFlow(ScannerUiState())
    val uiState: StateFlow<ScannerUiState> = _uiState.asStateFlow()

    init {
        Log.d(TAG, "ViewModel created, starting observation")
        observeBleManager()
    }

    private fun observeBleManager() {
        // Наблюдаем за статусом сканирования
        viewModelScope.launch {
            Log.d(TAG, "Observing isScanning")
            bleManager.isScanning.collect { isScanning ->
                Log.d(TAG, "isScanning changed: $isScanning")
                _uiState.update { it.copy(isScanning = isScanning) }
            }
        }

        // Наблюдаем за найденными маяками
        viewModelScope.launch {
            Log.d(TAG, "Observing discoveredBeacons")
            bleManager.discoveredBeacons.collect { altBeacons ->
                Log.d(TAG, "discoveredBeacons changed: ${altBeacons.size} beacons")
                
                val beacons = altBeacons.map { altBeacon ->
                    Beacon(
                        id = "${altBeacon.id1}_${altBeacon.id2}_${altBeacon.id3}",
                        name = "Маяк ${altBeacon.id3.toInt()}",
                        major = altBeacon.id2.toInt(),
                        minor = altBeacon.id3.toInt(),
                        rssi = altBeacon.rssi,
                        distance = altBeacon.distance,
                        is_active = true,
                        location = "Major: ${altBeacon.id2.toInt()}, Minor: ${altBeacon.id3.toInt()}",
                        lastSeen = System.currentTimeMillis()
                    )
                }
                
                Log.d(TAG, "Converted to ${beacons.size} domain beacons")
                
                _uiState.update {
                    it.copy(
                        beacons = beacons,
                        activeBeaconsCount = beacons.count { b -> b.is_active }
                    )
                }
                
                Log.d(TAG, "UI state updated: ${_uiState.value.beacons.size} beacons in UI")
            }
        }
    }

    fun startScanning() {
        Log.d(TAG, "startScanning called")
        viewModelScope.launch {
            bleManager.loadAllowedBeacons()
            bleManager.startScanning()
        }
    }

    fun stopScanning() {
        Log.d(TAG, "stopScanning called")
        bleManager.stopScanning()
    }

    fun setPermissionsGranted(granted: Boolean) {
        Log.d(TAG, "setPermissionsGranted: $granted")
        _uiState.update { it.copy(permissionsGranted = granted) }
        if (granted) {
            startScanning()
        }
    }

    override fun onCleared() {
        super.onCleared()
        Log.d(TAG, "ViewModel cleared")
        stopScanning()
    }
}
