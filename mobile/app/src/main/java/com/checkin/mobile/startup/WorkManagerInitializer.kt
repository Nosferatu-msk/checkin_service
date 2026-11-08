package com.checkin.mobile.startup

import android.content.Context
import androidx.startup.Initializer
import androidx.work.Configuration
import androidx.work.WorkManager
import com.checkin.mobile.worker.SyncWorker

class WorkManagerInitializer : Initializer<WorkManager> {
    
    override fun create(context: Context): WorkManager {
        val configuration = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
        
        WorkManager.initialize(context, configuration)
        
        // Enqueue periodic sync
        SyncWorker.enqueue(context)
        
        return WorkManager.getInstance(context)
    }
    
    override fun dependencies(): List<Class<out Initializer<*>>> {
        return emptyList()
    }
}
