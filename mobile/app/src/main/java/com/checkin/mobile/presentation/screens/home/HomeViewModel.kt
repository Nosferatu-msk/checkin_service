package com.checkin.mobile.presentation.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.checkin.mobile.domain.usecase.auth.GetCurrentUserUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val userName: String = "",
    val isScanning: Boolean = false,
    val beaconsCount: Int = 0,
    val lastSyncTime: String? = null,
    val pendingRecords: Int = 0
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getCurrentUserUseCase: GetCurrentUserUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
    
    init {
        loadUserData()
    }
    
    private fun loadUserData() {
        viewModelScope.launch {
            getCurrentUserUseCase()
                .onSuccess { user ->
                    _uiState.update { it.copy(userName = user.fullName) }
                }
        }
    }
}
