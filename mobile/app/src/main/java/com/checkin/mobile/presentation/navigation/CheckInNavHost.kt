package com.checkin.mobile.presentation.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.checkin.mobile.domain.repository.AuthRepository
import com.checkin.mobile.presentation.components.BottomNavItem
import com.checkin.mobile.presentation.components.CheckInBottomNavigation
import com.checkin.mobile.presentation.screens.auth.*
import com.checkin.mobile.presentation.screens.history.HistoryScreen
import com.checkin.mobile.presentation.screens.scanner.BeaconScannerScreen
import com.checkin.mobile.presentation.screens.settings.SettingsScreen
import com.checkin.mobile.util.TokenManager

@Composable
fun CheckInNavHost(
    authRepository: AuthRepository,
    tokenManager: TokenManager
) {
    val navController = rememberNavController()
    var startDestination by rememberSaveable { mutableStateOf(Screen.Login.route) }
    var isCheckingAuth by rememberSaveable { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val isLoggedIn = authRepository.isLoggedIn()

        if (isLoggedIn) {
            val hasPin = tokenManager.hasPin()
            val isBiometricEnabled = tokenManager.isBiometricEnabled()

            startDestination = when {
                isBiometricEnabled && hasPin -> Screen.BiometricLogin.route
                hasPin -> Screen.PinLogin.route
                else -> Screen.BeaconScanner.route
            }
        } else {
            startDestination = Screen.Login.route
        }

        isCheckingAuth = false
    }

    if (isCheckingAuth) {
        return
    }

    // Bottom navigation items
    val bottomNavItems = listOf(
        BottomNavItem(
            route = Screen.BeaconScanner.route,
            title = "Маяки",
            icon = Icons.Default.Notifications
        ),
        BottomNavItem(
            route = Screen.History.route,
            title = "История",
            icon = Icons.Default.History
        ),
        BottomNavItem(
            route = Screen.Settings.route,
            title = "Настройки",
            icon = Icons.Default.Settings
        )
    )

    // Routes that show bottom navigation
    val bottomNavRoutes = setOf(
        Screen.BeaconScanner.route,
        Screen.History.route,
        Screen.Settings.route
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Check if current screen should show bottom navigation
    val showBottomBar = currentRoute in bottomNavRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                CheckInBottomNavigation(
                    items = bottomNavItems,
                    currentRoute = currentRoute,
                    onItemSelected = { item ->
                        navController.navigate(item.route) {
                            popUpTo(Screen.BeaconScanner.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Auth screens
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.PinSetup.route)
                    }
                )
            }

            composable(Screen.PinSetup.route) {
                PinSetupScreen(
                    onPinSet = {
                        navController.navigate(Screen.BiometricSetup.route)
                    },
                    onSkip = {
                        navController.navigate(Screen.BeaconScanner.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.BiometricSetup.route) {
                BiometricSetupScreen(
                    onBiometricEnabled = {
                        navController.navigate(Screen.BeaconScanner.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onSkip = {
                        navController.navigate(Screen.BeaconScanner.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }

            // Return-user auth screens
            composable(Screen.PinLogin.route) {
                PinLoginScreen(
                    onPinVerified = {
                        navController.navigate(Screen.BeaconScanner.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onForgotPin = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.BiometricLogin.route) {
                BiometricLoginScreen(
                    onBiometricVerified = {
                        navController.navigate(Screen.BeaconScanner.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onFallbackToPin = {
                        navController.navigate(Screen.PinLogin.route) {
                            popUpTo(Screen.BiometricLogin.route) { inclusive = true }
                        }
                    }
                )
            }

            // Main screens with bottom navigation
            composable(Screen.BeaconScanner.route) {
                BeaconScannerScreen()
            }

            composable(Screen.History.route) {
                HistoryScreen()
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onLogoutSuccess = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object PinSetup : Screen("pin_setup")
    data object BiometricSetup : Screen("biometric_setup")
    data object PinLogin : Screen("pin_login")
    data object BiometricLogin : Screen("biometric_login")
    data object BeaconScanner : Screen("beacon_scanner")
    data object History : Screen("history")
    data object Settings : Screen("settings")
}
