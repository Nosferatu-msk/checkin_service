package com.checkin.mobile.presentation.screens.auth

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.domain.usecase.auth.EnableBiometricUseCase
import com.checkin.mobile.util.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BiometricSetupUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val isBiometricAvailable: Boolean = true,
    val showBiometricPrompt: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class BiometricSetupViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val enableBiometricUseCase: EnableBiometricUseCase,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(BiometricSetupUiState())
    val uiState: StateFlow<BiometricSetupUiState> = _uiState.asStateFlow()

    init {
        checkBiometricAvailability()
    }

    private fun checkBiometricAvailability() {
        val biometricManager = BiometricManager.from(context)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        )
        val isAvailable = canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS

        _uiState.update { it.copy(isBiometricAvailable = isAvailable) }
    }

    fun enableBiometric() {
        // Show biometric prompt first to verify biometric works
        _uiState.update { it.copy(showBiometricPrompt = true, error = null) }
    }

    fun onBiometricAuthenticated() {
        // Biometric verified, now save the setting
        _uiState.update { it.copy(showBiometricPrompt = false, isLoading = true) }

        viewModelScope.launch {
            enableBiometricUseCase(true)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Ошибка включения биометрии"
                        )
                    }
                }
        }
    }

    fun onBiometricError(error: String?) {
        _uiState.update {
            it.copy(
                showBiometricPrompt = false,
                error = error
            )
        }
    }
}
