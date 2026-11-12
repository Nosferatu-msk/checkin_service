package com.checkin.mobile.presentation.screens.auth

import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import com.checkin.mobile.presentation.components.PrimaryButton

@Composable
fun BiometricLoginScreen(
    onBiometricVerified: () -> Unit,
    onFallbackToPin: () -> Unit,
    viewModel: BiometricLoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val activity = context as? FragmentActivity

    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated) {
            onBiometricVerified()
        }
    }

    LaunchedEffect(activity, uiState.isBiometricAvailable) {
        if (activity != null && uiState.isBiometricAvailable) {
            showBiometricPrompt(
                activity = activity,
                context = context,
                onAuthenticated = viewModel::onAuthenticated,
                onError = viewModel::onError,
                onFallback = onFallbackToPin
            )
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
            text = "Вход в систему",
            style = MaterialTheme.typography.headlineLarge
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Используйте отпечаток пальца или Face ID для входа",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        if (uiState.error != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = uiState.error!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        Spacer(modifier = Modifier.height(48.dp))

        PrimaryButton(
            text = "Использовать биометрию",
            onClick = {
                if (activity != null && uiState.isBiometricAvailable) {
                    showBiometricPrompt(
                        activity = activity,
                        context = context,
                        onAuthenticated = viewModel::onAuthenticated,
                        onError = viewModel::onError,
                        onFallback = onFallbackToPin
                    )
                }
            },
            enabled = uiState.isBiometricAvailable
        )

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(
            onClick = onFallbackToPin
        ) {
            Text("Использовать PIN")
        }
    }
}

private fun showBiometricPrompt(
    activity: FragmentActivity,
    context: android.content.Context,
    onAuthenticated: () -> Unit,
    onError: (String?) -> Unit,
    onFallback: () -> Unit
) {
    val executor = ContextCompat.getMainExecutor(context)

    val biometricPrompt = BiometricPrompt(
        activity,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onAuthenticated()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                when (errorCode) {
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON -> {
                        onFallback()
                    }
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_CANCELED -> {
                        // User cancelled, do nothing
                    }
                    BiometricPrompt.ERROR_LOCKOUT,
                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> {
                        onError("Слишком много попыток. Используйте PIN.")
                    }
                    else -> {
                        onError(errString.toString())
                    }
                }
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                onError("Биометрия не распознана. Попробуйте ещё раз.")
            }
        }
    )

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Вход в систему")
        .setSubtitle("Используйте отпечаток пальца или Face ID")
        .setNegativeButtonText("Использовать PIN")
        .build()

    biometricPrompt.authenticate(promptInfo)
}
