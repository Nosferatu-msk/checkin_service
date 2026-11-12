package com.checkin.mobile.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.checkin.mobile.service.BleScanningService
import com.checkin.mobile.util.TokenManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BootCompletedReceiver : BroadcastReceiver() {

    @Inject
    lateinit var tokenManager: TokenManager

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            // Проверяем, авторизован ли пользователь перед запуском сервиса
            val accessToken = tokenManager.getAccessToken()
            if (accessToken.isNullOrEmpty()) {
                Log.d(TAG, "User not authorized, skipping BLE service start after boot")
                return
            }

            Log.d(TAG, "Boot completed, starting BLE scanning service")

            val serviceIntent = Intent(context, BleScanningService::class.java).apply {
                action = BleScanningService.ACTION_START
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }

    companion object {
        private const val TAG = "BootCompletedReceiver"
    }
}
