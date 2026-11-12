package com.checkin.mobile.domain.repository

interface SettingsRepository {
    suspend fun getAllowedBeaconUuids(): List<String>
    suspend fun getAggregationInterval(): Int
    suspend fun getSyncInterval(): Int
    suspend fun refreshSettings()
}
