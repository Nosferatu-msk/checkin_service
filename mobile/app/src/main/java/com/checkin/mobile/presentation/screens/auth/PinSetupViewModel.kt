package com.checkin.mobile.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.domain.usecase.auth.SetPinUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PinSetupUiState(
    val pin: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PinSetupViewModel @Inject constructor(
    private val setPinUseCase: SetPinUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(PinSetupUiState())
    val uiState: StateFlow<PinSetupUiState> = _uiState.asStateFlow()
    
    fun onPinChange(pin: String) {
        _uiState.update { it.copy(pin = pin, error = null) }
    }
    
    fun setPin() {
        val currentState = _uiState.value
        
        if (currentState.pin.length < 4) {
            _uiState.update { it.copy(error = "PIN должен содержать минимум 4 цифры") }
            return
        }
        
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            setPinUseCase(currentState.pin)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            error = error.message ?: "Ошибка установки PIN"
                        )
                    }
                }
        }
    }
}
