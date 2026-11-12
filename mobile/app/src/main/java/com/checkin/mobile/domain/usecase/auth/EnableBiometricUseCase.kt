package com.checkin.mobile.domain.usecase.auth

import android.content.Context
import androidx.biometric.BiometricManager
import com.checkin.mobile.util.TokenManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class EnableBiometricUseCase @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenManager: TokenManager
) {
    suspend operator fun invoke(enable: Boolean): Result<Boolean> {
        return try {
            val biometricManager = BiometricManager.from(context)
            val canAuthenticate = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG
            )

            if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS) {
                tokenManager.setBiometricEnabled(enable)
                Result.success(true)
            } else {
                Result.failure(Exception("Biometric not available"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun isBiometricAvailable(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }
}
