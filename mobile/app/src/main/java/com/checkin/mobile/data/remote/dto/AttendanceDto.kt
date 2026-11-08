package com.checkin.mobile.data.remote.dto

import com.google.gson.annotations.SerializedName

data class SubmitAttendanceRequest(
    @SerializedName("request_id") val request_id: String,
    @SerializedName("records") val records: List<AttendanceRecord>
) {
    data class AttendanceRecord(
        @SerializedName("beacon_uuid") val beacon_uuid: String,
        @SerializedName("mac_address") val mac_address: String,
        @SerializedName("scan_timestamp_start") val scan_timestamp_start: String,
        @SerializedName("scan_timestamp_end") val scan_timestamp_end: String,
        @SerializedName("median_rssi") val median_rssi: Float,
        @SerializedName("min_rssi") val min_rssi: Float,
        @SerializedName("max_rssi") val max_rssi: Float,
        @SerializedName("samples_count") val samples_count: Int,
        @SerializedName("device_fingerprint") val device_fingerprint: String
    )
}

data class SubmitAttendanceResponse(
    @SerializedName("accepted") val accepted: Int,
    @SerializedName("synced_at") val synced_at: String
)
