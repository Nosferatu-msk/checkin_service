package com.checkin.mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date

@Entity(tableName = "beacon_scans")
data class BeaconScanEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val beacon_uuid: String,
    val major: Int,
    val minor: Int,
    val mac_address: String?,
    val scan_timestamp_start: Date,
    val scan_timestamp_end: Date,
    val median_rssi: Float,
    val min_rssi: Float,
    val max_rssi: Float,
    val samples_count: Int,
    val sync_status: String = "pending", // pending, synced, failed
    val created_at: Date = Date()
)
