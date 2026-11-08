package com.checkin.mobile.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.domain.usecase.auth.LoginUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val login: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()
    
    fun onLoginChange(login: String) {
        _uiState.update { it.copy(login = login, error = null) }
    }
    
    fun onPasswordChange(password: String) {
        _uiState.update { it.copy(password = password, error = null) }
    }
    
    fun login() {
        val currentState = _uiState.value
        
        if (currentState.login.isBlank() || currentState.password.isBlank()) {
            _uiState.update { it.copy(error = "Заполните все поля") }
            return
        }
        
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            loginUseCase(currentState.login, currentState.password)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            error = error.message ?: "Ошибка входа"
                        )
                    }
                }
        }
    }
}
