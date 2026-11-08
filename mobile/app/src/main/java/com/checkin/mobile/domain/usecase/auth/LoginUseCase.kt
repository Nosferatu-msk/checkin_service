package com.checkin.mobile.domain.usecase.auth

import com.checkin.mobile.domain.repository.AuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(login: String, password: String): Result<Unit> {
        return authRepository.login(login, password)
    }
}
