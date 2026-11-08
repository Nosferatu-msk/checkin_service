package com.checkin.mobile.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.checkin.mobile.data.local.BeaconDao
import com.checkin.mobile.data.remote.ApiService
import com.checkin.mobile.data.remote.dto.SubmitAttendanceRequest
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.*
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val beaconDao: BeaconDao,
    private val apiService: ApiService
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            // Get pending beacon scans
            val pendingScans = beaconDao.getPendingBeaconScansOnce()
            
            if (pendingScans.isEmpty()) {
                return Result.success()
            }

            // Group by request_id (batch by timestamp)
            val batches = pendingScans.groupBy { 
                it.scan_timestamp_start.time / (10 * 60 * 1000) // 10-minute batches
            }

            batches.forEach { (_, scans) ->
                try {
                    // Convert to DTO
                    val request = SubmitAttendanceRequest(
                        request_id = UUID.randomUUID().toString(),
                        records = scans.map { scan ->
                            SubmitAttendanceRequest.AttendanceRecord(
                                beacon_uuid = scan.beacon_uuid,
                                mac_address = scan.mac_address ?: "",
                                scan_timestamp_start = scan.scan_timestamp_start.toInstant().toString(),
                                scan_timestamp_end = scan.scan_timestamp_end.toInstant().toString(),
                                median_rssi = scan.median_rssi,
                                min_rssi = scan.min_rssi,
                                max_rssi = scan.max_rssi,
                                samples_count = scan.samples_count,
                                device_fingerprint = getDeviceFingerprint()
                            )
                        }
                    )

                    // Send to server
                    apiService.submitAttendance(request)

                    // Mark as synced
                    beaconDao.markAsSynced(scans.map { it.id })

                } catch (e: Exception) {
                    // Mark as failed
                    beaconDao.markAsFailed(scans.map { it.id })
                    
                    // If it's a network error, retry
                    if (e is java.net.UnknownHostException || e is java.net.SocketTimeoutException) {
                        return Result.retry()
                    }
                }
            }

            // Clean up old synced records
            beaconDao.deleteSynced()

            Result.success()
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun getDeviceFingerprint(): String {
        // TODO: Implement device fingerprint collection
        return "device_fingerprint_hash"
    }

    companion object {
        const val WORK_NAME = "sync_worker"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
        }
    }
}
