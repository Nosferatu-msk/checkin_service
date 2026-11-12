package com.checkin.mobile.util

import android.content.Context
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlayIntegrityManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val integrityManager by lazy {
        IntegrityManagerFactory.create(context)
    }

    suspend fun checkIntegrity(): Result<String> {
        return try {
            val request = IntegrityTokenRequest.builder()
                .setCloudProjectNumber(123456789L) // Заменить на реальный
                .build()

            val tokenResult = integrityManager.requestIntegrityToken(request)
            val token = tokenResult.await().token()

            Result.success(token)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
