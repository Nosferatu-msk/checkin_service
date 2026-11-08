package com.checkin.mobile.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("login") val login: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("access_token") val access_token: String,
    @SerializedName("refresh_token") val refresh_token: String,
    @SerializedName("user") val user: UserDto
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("login") val login: String,
    @SerializedName("email") val email: String,
    @SerializedName("full_name") val full_name: String,
    @SerializedName("role") val role: String
)

data class RefreshTokenResponse(
    @SerializedName("access_token") val access_token: String,
    @SerializedName("expires_in") val expires_in: Int
)
