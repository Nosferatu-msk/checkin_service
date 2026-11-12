package com.checkin.mobile.util

import android.bluetooth.le.ScanResult
import android.os.Build
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockBleDetector @Inject constructor() {
    fun isMockBle(scanResult: ScanResult): Boolean {
        // Проверить, является ли сканирование mock (требует API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (scanResult.isFromMockProvider) {
                return true
            }
        }

        // Проверить аномалии в RSSI
        val rssi = scanResult.rssi
        if (rssi == 0 || rssi > -20 || rssi < -120) {
            return true
        }

        return false
    }
}
