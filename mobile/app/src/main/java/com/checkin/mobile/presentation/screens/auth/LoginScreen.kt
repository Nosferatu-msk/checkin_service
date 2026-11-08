package com.checkin.mobile.presentation.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.checkin.mobile.presentation.components.PrimaryButton
import com.checkin.mobile.presentation.components.PrimaryTextField

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onLoginSuccess()
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Контроль присутствия",
            style = MaterialTheme.typography.headlineLarge
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
        PrimaryTextField(
            value = uiState.login,
            onValueChange = viewModel::onLoginChange,
            label = "Логин",
            enabled = !uiState.isLoading
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        PrimaryTextField(
            value = uiState.password,
            onValueChange = viewModel::onPasswordChange,
            label = "Пароль",
            isPassword = true,
            enabled = !uiState.isLoading
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        PrimaryButton(
            text = "Войти",
            onClick = viewModel::login,
            isLoading = uiState.isLoading,
            enabled = !uiState.isLoading
        )
        
        if (uiState.error != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = uiState.error!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
