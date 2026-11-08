package com.checkin.mobile.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.checkin.mobile.presentation.screens.auth.LoginScreen
import com.checkin.mobile.presentation.screens.auth.PinSetupScreen
import com.checkin.mobile.presentation.screens.auth.BiometricSetupScreen
import com.checkin.mobile.presentation.screens.home.HomeScreen
import com.checkin.mobile.presentation.screens.settings.SettingsScreen

@Composable
fun CheckInNavHost() {
    val navController = rememberNavController()
    
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
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
                }
            )
        }
    }
}

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object PinSetup : Screen("pin_setup")
    data object BiometricSetup : Screen("biometric_setup")
    data object Home : Screen("home")
    data object Settings : Screen("settings")
}
