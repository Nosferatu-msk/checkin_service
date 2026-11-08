package com.checkin.mobile.domain.repository

interface AuthRepository {
    suspend fun login(login: String, password: String): Result<Unit>
    suspend fun logout(): Result<Unit>
    suspend fun refreshToken(): Result<String>
    suspend fun isLoggedIn(): Boolean
    suspend fun getAccessToken(): String?
}
