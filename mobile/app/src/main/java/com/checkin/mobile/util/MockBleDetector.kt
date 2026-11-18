package com.checkin.mobile.util

import android.bluetooth.le.ScanResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockBleDetector @Inject constructor() {
    fun isMockBle(scanResult: ScanResult): Boolean {
        // Проверить аномалии в RSSI для определения mock-сканирования
        val rssi = scanResult.rssi
        if (rssi == 0 || rssi > -20 || rssi < -120) {
            return true
        }

        return false
    }
}
