package com.checkin.mobile.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.checkin.mobile.domain.repository.AuthRepository
import com.checkin.mobile.presentation.screens.auth.BiometricLoginScreen
import com.checkin.mobile.presentation.screens.auth.BiometricSetupScreen
import com.checkin.mobile.presentation.screens.auth.LoginScreen
import com.checkin.mobile.presentation.screens.auth.PinLoginScreen
import com.checkin.mobile.presentation.screens.auth.PinSetupScreen
import com.checkin.mobile.presentation.screens.home.HomeScreen
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
                else -> Screen.Home.route
            }
        } else {
            startDestination = Screen.Login.route
        }

        isCheckingAuth = false
    }

    if (isCheckingAuth) {
        // Splash / loading state while checking auth
        return
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
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
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.BiometricSetup.route) {
            BiometricSetupScreen(
                onBiometricEnabled = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onSkip = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        // Return-user auth screens
        composable(Screen.PinLogin.route) {
            PinLoginScreen(
                onPinVerified = {
                    navController.navigate(Screen.Home.route) {
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
                    navController.navigate(Screen.Home.route) {
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

        // Main screens
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                }
            )
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

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object PinSetup : Screen("pin_setup")
    data object BiometricSetup : Screen("biometric_setup")
    data object PinLogin : Screen("pin_login")
    data object BiometricLogin : Screen("biometric_login")
    data object Home : Screen("home")
    data object Settings : Screen("settings")
}
