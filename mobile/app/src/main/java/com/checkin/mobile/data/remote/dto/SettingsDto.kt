package com.checkin.mobile.data.remote.dto

import com.google.gson.annotations.SerializedName

data class MobileSettingsResponse(
    @SerializedName("allowed_beacon_uuids") val allowed_beacon_uuids: List<String>,
    @SerializedName("aggregation_interval_sec") val aggregation_interval_sec: Int,
    @SerializedName("sync_interval_sec") val sync_interval_sec: Int
)
