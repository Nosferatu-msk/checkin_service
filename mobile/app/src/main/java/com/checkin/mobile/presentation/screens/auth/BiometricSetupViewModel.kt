package com.checkin.mobile.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.domain.usecase.auth.EnableBiometricUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
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
    val error: String? = null
)

@HiltViewModel
class BiometricSetupViewModel @Inject constructor(
    private val enableBiometricUseCase: EnableBiometricUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(BiometricSetupUiState())
    val uiState: StateFlow<BiometricSetupUiState> = _uiState.asStateFlow()
    
    init {
        checkBiometricAvailability()
    }
    
    private fun checkBiometricAvailability() {
        // TODO: Check if biometric is available on device
        _uiState.update { it.copy(isBiometricAvailable = true) }
    }
    
    fun enableBiometric() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            enableBiometricUseCase()
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
}
