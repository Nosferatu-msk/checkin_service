package com.checkin.mobile.presentation.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.checkin.mobile.presentation.components.PrimaryButton

@Composable
fun BiometricSetupScreen(
    onBiometricEnabled: () -> Unit,
    onSkip: () -> Unit,
    viewModel: BiometricSetupViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onBiometricEnabled()
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Fingerprint,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Включить биометрию?",
            style = MaterialTheme.typography.headlineLarge
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Используйте отпечаток пальца или Face ID для быстрого входа",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
        PrimaryButton(
            text = "Включить биометрию",
            onClick = viewModel::enableBiometric,
            isLoading = uiState.isLoading,
            enabled = uiState.isBiometricAvailable && !uiState.isLoading
        )
        
        if (!uiState.isBiometricAvailable) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Биометрия недоступна на этом устройстве",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(
            onClick = onSkip,
            enabled = !uiState.isLoading
        ) {
            Text("Пропустить")
        }
    }
}
