package com.checkin.mobile.di

import android.content.Context
import androidx.room.Room
import com.checkin.mobile.data.local.BeaconDao
import com.checkin.mobile.data.local.CheckInDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context
    ): CheckInDatabase {
        return Room.databaseBuilder(
            context,
            CheckInDatabase::class.java,
            "checkin_database"
        ).build()
    }

    @Provides
    @Singleton
    fun provideBeaconDao(
        database: CheckInDatabase
    ): BeaconDao {
        return database.beaconDao()
    }
}
