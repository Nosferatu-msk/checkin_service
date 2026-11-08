package com.checkin.mobile.domain.model

data class User(
    val id: String,
    val login: String,
    val email: String,
    val fullName: String,
    val role: String
)
