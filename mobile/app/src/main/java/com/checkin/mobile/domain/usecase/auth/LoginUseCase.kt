package com.checkin.mobile.domain.usecase.auth

import android.util.Log
import com.checkin.mobile.domain.repository.AuthRepository
import com.checkin.mobile.util.DeviceFingerprintManager
import com.checkin.mobile.util.EmulatorDetector
import com.checkin.mobile.util.PlayIntegrityManager
import com.checkin.mobile.util.RootDetector
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository,
    private val deviceFingerprintManager: DeviceFingerprintManager,
    private val rootDetector: RootDetector,
    private val emulatorDetector: EmulatorDetector,
    private val playIntegrityManager: PlayIntegrityManager
) {
    suspend operator fun invoke(login: String, password: String): Result<Unit> {
        // Фрод-контроль: проверка root
        if (rootDetector.isDeviceRooted()) {
            return Result.failure(Exception("Rooted device detected"))
        }

        // Фрод-контроль: проверка эмулятора
        if (emulatorDetector.isEmulator()) {
            return Result.failure(Exception("Emulator detected"))
        }

        // Фрод-контроль: Play Integrity API (опционально - только логируем)
        val integrityResult = playIntegrityManager.checkIntegrity()
        if (integrityResult.isFailure) {
            // Логируем ошибку, но не блокируем вход
            // TODO: В production можно сделать проверку обязательной
            Log.w("LoginUseCase", "Play Integrity check failed, but allowing login for testing")
        }

        // Продолжить логин
        val fingerprint = deviceFingerprintManager.getDeviceFingerprint()
        return authRepository.login(login, password, fingerprint)
    }
}
