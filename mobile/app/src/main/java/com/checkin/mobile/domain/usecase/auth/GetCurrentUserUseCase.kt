package com.checkin.mobile.domain.usecase.auth

import com.checkin.mobile.domain.model.User
import com.checkin.mobile.domain.repository.AuthRepository
import javax.inject.Inject

class GetCurrentUserUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): Result<User> {
        // TODO: Get current user from API or local storage
        return Result.success(
            User(
                id = "1",
                login = "testic",
                email = "testic@test.ru",
                fullName = "Тестовый Пользователь",
                role = "employee"
            )
        )
    }
}
