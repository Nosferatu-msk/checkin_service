package com.checkin.mobile.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.checkin.mobile.data.local.entity.BeaconScanEntity

@Database(
    entities = [BeaconScanEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class CheckInDatabase : RoomDatabase() {
    abstract fun beaconDao(): BeaconDao
}
