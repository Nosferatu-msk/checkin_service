package com.checkin.mobile

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class CheckInApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        // Initialize app components
    }
}
