package com.checkin.mobile.domain.usecase.auth

import com.checkin.mobile.domain.repository.AuthRepository
import javax.inject.Inject

class SetPinUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(pin: String): Result<Unit> {
        // TODO: Save PIN securely (EncryptedSharedPreferences)
        return Result.success(Unit)
    }
}
