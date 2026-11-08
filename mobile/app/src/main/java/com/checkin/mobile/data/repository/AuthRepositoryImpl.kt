package com.checkin.mobile.data.repository

import com.checkin.mobile.data.remote.ApiService
import com.checkin.mobile.data.remote.dto.LoginRequest
import com.checkin.mobile.data.remote.dto.LoginResponse
import com.checkin.mobile.domain.repository.AuthRepository
import com.checkin.mobile.util.TokenManager
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : AuthRepository {
    
    override suspend fun login(login: String, password: String): Result<Unit> {
        return try {
            val response = apiService.login(LoginRequest(login, password))
            tokenManager.saveTokens(response.access_token, response.refresh_token)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun logout(): Result<Unit> {
        return try {
            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken != null) {
                apiService.logout(refreshToken)
            }
            tokenManager.clearTokens()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun refreshToken(): Result<String> {
        return try {
            val refreshToken = tokenManager.getRefreshToken()
                ?: return Result.failure(Exception("No refresh token"))
            val response = apiService.refreshToken(refreshToken)
            tokenManager.saveAccessToken(response.access_token)
            Result.success(response.access_token)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun isLoggedIn(): Boolean {
        return tokenManager.getAccessToken() != null
    }
    
    override suspend fun getAccessToken(): String? {
        return tokenManager.getAccessToken()
    }
}
