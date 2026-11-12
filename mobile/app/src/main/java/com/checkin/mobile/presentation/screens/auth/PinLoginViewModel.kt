package com.checkin.mobile.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.util.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PinLoginUiState(
    val pin: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val attempts: Int = 0,
    val isVerified: Boolean = false
)

@HiltViewModel
class PinLoginViewModel @Inject constructor(
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(PinLoginUiState())
    val uiState: StateFlow<PinLoginUiState> = _uiState.asStateFlow()

    fun onPinChange(pin: String) {
        if (pin.length <= 6) {
            _uiState.update { it.copy(pin = pin, error = null) }
        }
    }

    fun verifyPin() {
        val currentState = _uiState.value

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val savedPin = tokenManager.getPin()

            if (savedPin != null && savedPin == currentState.pin) {
                _uiState.update { it.copy(isLoading = false, isVerified = true) }
            } else {
                val newAttempts = currentState.attempts + 1
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        pin = "",
                        error = "Неверный PIN-код",
                        attempts = newAttempts
                    )
                }
            }
        }
    }
}
