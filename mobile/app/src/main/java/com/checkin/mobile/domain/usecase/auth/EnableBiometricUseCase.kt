package com.checkin.mobile.domain.usecase.auth

import com.checkin.mobile.domain.repository.AuthRepository
import javax.inject.Inject

class EnableBiometricUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): Result<Unit> {
        // TODO: Enable biometric authentication
        return Result.success(Unit)
    }
}
