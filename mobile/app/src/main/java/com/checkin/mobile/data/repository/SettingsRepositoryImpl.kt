package com.checkin.mobile.data.repository

import android.util.Log
import com.checkin.mobile.data.remote.ApiService
import com.checkin.mobile.domain.model.AppSettings
import com.checkin.mobile.domain.repository.SettingsRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : SettingsRepository {

    companion object {
        private const val TAG = "SettingsRepository"
        private const val DEFAULT_AGGREGATION_INTERVAL = 600 // 10 minutes
        private const val DEFAULT_SYNC_INTERVAL = 900 // 15 minutes
    }

    private var cachedSettings: AppSettings? = null

    override suspend fun getAllowedBeaconUuids(): List<String> {
        if (cachedSettings == null) {
            refreshSettings()
        }
        return cachedSettings?.allowedBeaconUuids ?: emptyList()
    }

    override suspend fun getAggregationInterval(): Int {
        if (cachedSettings == null) {
            refreshSettings()
        }
        return cachedSettings?.aggregationInterval ?: DEFAULT_AGGREGATION_INTERVAL
    }

    override suspend fun getSyncInterval(): Int {
        if (cachedSettings == null) {
            refreshSettings()
        }
        return cachedSettings?.syncInterval ?: DEFAULT_SYNC_INTERVAL
    }

    override suspend fun refreshSettings() {
        try {
            val response = apiService.getMobileSettings()
            cachedSettings = AppSettings(
                allowedBeaconUuids = response.allowed_beacon_uuids,
                aggregationInterval = response.aggregation_interval_sec,
                syncInterval = response.sync_interval_sec
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to refresh settings", e)
            // Keep cached settings or use defaults on next access
        }
    }
}
