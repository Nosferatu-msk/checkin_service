package com.checkin.mobile.util

import android.content.Context
import android.os.Build
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceFingerprintManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun getDeviceFingerprint(): String {
        val deviceInfo = buildString {
            append(Build.MANUFACTURER).append("|")
            append(Build.MODEL).append("|")
            append(Build.BRAND).append("|")
            append(Build.DEVICE).append("|")
            append(Build.HARDWARE).append("|")

            val androidId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID
            )
            append(androidId)
        }

        return sha256(deviceInfo)
    }

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
