package com.checkin.mobile.domain.usecase.auth

import com.checkin.mobile.util.TokenManager
import javax.inject.Inject

class SetPinUseCase @Inject constructor(
    private val tokenManager: TokenManager
) {
    suspend operator fun invoke(pin: String): Result<Unit> {
        return try {
            tokenManager.savePin(pin)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
