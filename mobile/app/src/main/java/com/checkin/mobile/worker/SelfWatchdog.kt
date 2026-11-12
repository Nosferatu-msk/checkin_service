package com.checkin.mobile.worker

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.checkin.mobile.service.BleScanningService
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Self-watchdog для проверки и перезапуска BleScanningService.
 * 
 * Согласно ТЗ (раздел 4.2), Foreground Service должен проверять себя каждые 5 минут
 * и перезапускаться если остановлен.
 */
@Singleton
class SelfWatchdog @Inject constructor(
    @ApplicationContext private val context: Context,
    private val workManager: WorkManager
) {
    companion object {
        private const val TAG = "SelfWatchdog"
        private const val WATCHDOG_WORK_NAME = "ble_scanning_watchdog"
    }

    /**
     * Запланировать периодическую проверку сервиса (каждые 5 минут).
     */
    fun scheduleWatchdog() {
        val constraints = Constraints.Builder()
            .setRequiresBatteryNotLow(true)
            .build()

        val watchdogRequest = PeriodicWorkRequestBuilder<WatchdogWorker>(
            5, TimeUnit.MINUTES
        ).setConstraints(constraints)
            .build()

        workManager.enqueueUniquePeriodicWork(
            WATCHDOG_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            watchdogRequest
        )

        Log.i(TAG, "Watchdog scheduled")
    }

    /**
     * Отменить проверку watchdog.
     */
    fun cancelWatchdog() {
        workManager.cancelUniqueWork(WATCHDOG_WORK_NAME)
        Log.i(TAG, "Watchdog cancelled")
    }
}

/**
 * Worker, который проверяет запущен ли BleScanningService и перезапускает его при необходимости.
 */
@HiltWorker
class WatchdogWorker @AssistedInject constructor(
    @Assisted private val context: Context,
    @Assisted workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "WatchdogWorker"
    }

    override suspend fun doWork(): Result {
        val isServiceRunning = isServiceRunning<BleScanningService>()

        if (!isServiceRunning) {
            // Перезапустить сервис
            val serviceIntent = Intent(context, BleScanningService::class.java).apply {
                action = BleScanningService.ACTION_START
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            Log.i(TAG, "BleScanningService restarted by watchdog")
        } else {
            Log.d(TAG, "BleScanningService is running")
        }

        return Result.success()
    }

    /**
     * Проверить, запущен ли указанный сервис.
     */
    private inline fun <reified T> isServiceRunning(): Boolean {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        @Suppress("DEPRECATION")
        return manager.getRunningServices(Integer.MAX_VALUE)
            .any { it.service.className == T::class.java.name }
    }
}
