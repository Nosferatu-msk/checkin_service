package com.checkin.mobile.domain.model

data class AppSettings(
    val allowedBeaconUuids: List<String>,
    val aggregationInterval: Int,
    val syncInterval: Int
)
