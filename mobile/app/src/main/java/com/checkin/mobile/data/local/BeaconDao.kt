package com.checkin.mobile.data.local

import androidx.room.*
import com.checkin.mobile.data.local.entity.BeaconScanEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BeaconDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBeaconScan(beaconScan: BeaconScanEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBeaconScans(beaconScans: List<BeaconScanEntity>)

    @Query("SELECT * FROM beacon_scans WHERE sync_status = 'pending' ORDER BY created_at ASC")
    fun getPendingBeaconScans(): Flow<List<BeaconScanEntity>>

    @Query("SELECT * FROM beacon_scans WHERE sync_status = 'pending' ORDER BY created_at ASC")
    suspend fun getPendingBeaconScansOnce(): List<BeaconScanEntity>

    @Query("UPDATE beacon_scans SET sync_status = 'synced' WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Long>)

    @Query("UPDATE beacon_scans SET sync_status = 'failed' WHERE id IN (:ids)")
    suspend fun markAsFailed(ids: List<Long>)

    @Query("DELETE FROM beacon_scans WHERE sync_status = 'synced'")
    suspend fun deleteSynced()

    @Query("SELECT COUNT(*) FROM beacon_scans WHERE sync_status = 'pending'")
    fun getPendingCount(): Flow<Int>

    @Query("SELECT * FROM beacon_scans ORDER BY created_at DESC LIMIT :limit")
    fun getRecentBeaconScans(limit: Int): Flow<List<BeaconScanEntity>>
}
