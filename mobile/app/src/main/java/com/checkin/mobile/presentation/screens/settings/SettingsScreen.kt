package com.checkin.mobile.presentation.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Настройки") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Назад"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Account section
            Text(
                text = "Аккаунт",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    SettingsItem(
                        title = "Сменить пароль",
                        onClick = { /* TODO */ }
                    )
                    HorizontalDivider()
                    SettingsItem(
                        title = "Изменить PIN",
                        onClick = { /* TODO */ }
                    )
                    HorizontalDivider()
                    SettingsItem(
                        title = "Биометрия",
                        onClick = { /* TODO */ }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Scanning section
            Text(
                text = "Сканирование",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    SettingsItem(
                        title = "Интервал агрегации",
                        subtitle = "10 минут",
                        onClick = { /* TODO */ }
                    )
                    HorizontalDivider()
                    SettingsItem(
                        title = "Интервал синхронизации",
                        subtitle = "10 минут",
                        onClick = { /* TODO */ }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // About section
            Text(
                text = "О приложении",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    SettingsItem(
                        title = "Версия",
                        subtitle = "1.0.0",
                        onClick = { }
                    )
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Logout button
            Button(
                onClick = { /* TODO: Logout */ },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Выйти")
            }
        }
    }
}

@Composable
private fun SettingsItem(
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(vertical = 12.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
