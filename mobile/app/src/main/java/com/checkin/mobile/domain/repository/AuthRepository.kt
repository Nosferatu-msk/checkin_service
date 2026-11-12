package com.checkin.mobile.domain.repository

import com.checkin.mobile.domain.model.User

interface AuthRepository {
    suspend fun login(login: String, password: String, deviceFingerprint: String): Result<Unit>
    suspend fun logout(): Result<Unit>
    suspend fun refreshToken(): Result<String>
    suspend fun isLoggedIn(): Boolean
    suspend fun getAccessToken(): String?
    suspend fun getCurrentUser(): User?
}
