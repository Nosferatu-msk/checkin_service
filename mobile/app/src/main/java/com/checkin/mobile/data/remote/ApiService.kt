package com.checkin.mobile.data.remote

import com.checkin.mobile.data.remote.dto.LoginRequest
import com.checkin.mobile.data.remote.dto.LoginResponse
import com.checkin.mobile.data.remote.dto.MobileSettingsResponse
import com.checkin.mobile.data.remote.dto.RefreshTokenResponse
import com.checkin.mobile.data.remote.dto.SubmitAttendanceRequest
import com.checkin.mobile.data.remote.dto.SubmitAttendanceResponse
import com.checkin.mobile.data.remote.dto.UserDto
import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/refresh")
    @FormUrlEncoded
    suspend fun refreshToken(@Field("refresh_token") refreshToken: String): RefreshTokenResponse

    @POST("auth/logout")
    @FormUrlEncoded
    suspend fun logout(@Field("refresh_token") refreshToken: String)

    @GET("auth/me")
    suspend fun getCurrentUser(): UserDto

    @POST("mobile/attendance")
    suspend fun submitAttendance(@Body request: SubmitAttendanceRequest): SubmitAttendanceResponse

    @GET("mobile/settings")
    suspend fun getMobileSettings(): MobileSettingsResponse
}
