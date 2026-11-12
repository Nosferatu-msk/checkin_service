package com.checkin.mobile.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.checkin.mobile.R
import com.checkin.mobile.presentation.MainActivity
import com.checkin.mobile.worker.SelfWatchdog
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BleScanningService : Service() {

    @Inject
    lateinit var bleManager: BleManager

    @Inject
    lateinit var selfWatchdog: SelfWatchdog

    private var wakeLock: PowerManager.WakeLock? = null
    private var isServiceStarted = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        // Запустить watchdog для самопроверки
        selfWatchdog.scheduleWatchdog()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startScanning()
            ACTION_STOP -> stopScanning()
        }
        return START_STICKY
    }

    private fun startScanning() {
        if (isServiceStarted) return

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        acquireWakeLock()
        bleManager.startScanning()
        isServiceStarted = true
    }

    private fun stopScanning() {
        if (!isServiceStarted) return

        bleManager.stopScanning()
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        isServiceStarted = false
    }

    override fun onDestroy() {
        super.onDestroy()
        stopScanning()
        // Остановить watchdog
        selfWatchdog.cancelWatchdog()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BLE Scanning",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Service for BLE beacon scanning"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Контроль присутствия")
            .setContentText("Сканирование BLE-маяков активно")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "CheckIn::BleScanningWakeLock"
            ).apply {
                acquire(10 * 60 * 1000L) // 10 minutes
            }
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
        wakeLock = null
    }

    companion object {
        const val ACTION_START = "com.checkin.mobile.action.START_SCANNING"
        const val ACTION_STOP = "com.checkin.mobile.action.STOP_SCANNING"
        const val CHANNEL_ID = "ble_scanning_channel"
        const val NOTIFICATION_ID = 1
    }
}
