package com.checkin.mobile.presentation.screens.auth

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

data class BiometricLoginUiState(
    val isBiometricAvailable: Boolean = false,
    val error: String? = null,
    val isAuthenticated: Boolean = false
)

@HiltViewModel
class BiometricLoginViewModel @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(BiometricLoginUiState())
    val uiState: StateFlow<BiometricLoginUiState> = _uiState.asStateFlow()

    init {
        checkBiometricAvailability()
    }

    private fun checkBiometricAvailability() {
        val biometricManager = BiometricManager.from(context)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        )
        val isAvailable = canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS

        _uiState.update {
            it.copy(
                isBiometricAvailable = isAvailable,
                error = if (!isAvailable) "Биометрия недоступна на этом устройстве" else null
            )
        }
    }

    fun onAuthenticated() {
        _uiState.update { it.copy(isAuthenticated = true) }
    }

    fun onError(error: String?) {
        _uiState.update { it.copy(error = error) }
    }
}
