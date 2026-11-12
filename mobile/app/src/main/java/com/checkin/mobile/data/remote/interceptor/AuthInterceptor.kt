package com.checkin.mobile.data.remote.interceptor

import com.checkin.mobile.util.TokenManager
import okhttp3.FormBody
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Interceptor для автоматической обработки 401/403 ответов.
 *
 * - 401 (Unauthorized): автоматически пытается refresh token и повторяет запрос
 * - 403 (Forbidden): принудительный logout (token отозван, device mismatch)
 *
 * Использует прямой HTTP вызов для refresh чтобы избежать циклической зависимости
 * с AuthRepository -> ApiService -> Retrofit -> OkHttpClient -> AuthInterceptor.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {

    private val lock = Any()

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val originalResponse = chain.proceed(originalRequest)

        // Пропускаем auth endpoints чтобы избежать бесконечного цикла
        if (isAuthEndpoint(originalRequest.url.encodedPath)) {
            return originalResponse
        }

        // 401 — пробуем refresh token и повторить запрос
        if (originalResponse.code == HTTP_UNAUTHORIZED) {
            synchronized(lock) {
                val refreshToken = tokenManager.getRefreshToken()
                if (refreshToken.isNullOrEmpty()) {
                    forceLogout()
                    return originalResponse
                }

                val newToken = tryRefreshToken(refreshToken)

                if (newToken != null) {
                    val newRequest = originalRequest.newBuilder()
                        .header("Authorization", "Bearer $newToken")
                        .build()
                    // Закрываем оригинальный response чтобы избежать утечки ресурсов
                    originalResponse.close()
                    return chain.proceed(newRequest)
                } else {
                    // Refresh не удался — принудительный logout
                    forceLogout()
                }
            }
        }

        // 403 — принудительный logout (token отозван или device mismatch)
        if (originalResponse.code == HTTP_FORBIDDEN) {
            forceLogout()
        }

        return originalResponse
    }

    private fun isAuthEndpoint(path: String): Boolean {
        return path.endsWith("auth/login") || path.endsWith("auth/refresh")
    }

    /**
     * Выполняет синхронный refresh token через прямой HTTP вызов.
     * Использует отдельный OkHttpClient без interceptor'ов чтобы избежать
     * циклической зависимости и бесконечного цикла.
     */
    private fun tryRefreshToken(refreshToken: String): String? {
        return try {
            val client = OkHttpClient()
            val body = FormBody.Builder()
                .add("refresh_token", refreshToken)
                .build()
            val request = Request.Builder()
                .url("$BASE_URL/auth/refresh")
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val json = JSONObject(responseBody ?: return null)
                val newToken = json.getString("access_token")
                tokenManager.saveAccessToken(newToken)
                newToken
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun forceLogout() {
        tokenManager.clearTokens()
    }

    companion object {
        private const val BASE_URL = "https://api.checkin-service.com/"
        private const val HTTP_UNAUTHORIZED = 401
        private const val HTTP_FORBIDDEN = 403
    }
}
