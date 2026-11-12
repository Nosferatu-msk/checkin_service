package com.checkin.mobile.di

import com.checkin.mobile.data.repository.AuthRepositoryImpl
import com.checkin.mobile.data.repository.SettingsRepositoryImpl
import com.checkin.mobile.domain.repository.AuthRepository
import com.checkin.mobile.domain.repository.SettingsRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl
    ): AuthRepository

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(
        settingsRepositoryImpl: SettingsRepositoryImpl
    ): SettingsRepository
}
