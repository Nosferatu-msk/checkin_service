package com.checkin.mobile.di

import com.checkin.mobile.BuildConfig
import com.checkin.mobile.data.remote.ApiService
import com.checkin.mobile.data.remote.interceptor.AuthInterceptor
import com.checkin.mobile.util.TokenManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        tokenManager: TokenManager,
        authInterceptor: AuthInterceptor
    ): OkHttpClient {
        // Certificate Pinning — защита от MITM-атак
        // Placeholder hashes: заменить на реальные после получения сертификата от сервера
        val certificatePinner = CertificatePinner.Builder()
            .add("api.checkin-service.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .add("api.checkin-service.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
            .build()

        return OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            // Interceptor 1: добавляет Authorization header ко всем запросам
            .addInterceptor { chain ->
                val request = chain.request()
                val token = tokenManager.getAccessToken()

                val newRequest = if (token != null) {
                    request.newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else {
                    request
                }

                chain.proceed(newRequest)
            }
            // Interceptor 2: обрабатывает 401 (refresh + retry) и 403 (force logout)
            .addInterceptor(authInterceptor)
            // Interceptor 3: логирование (должен быть последним для полного логирования)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.checkin-service.com/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
