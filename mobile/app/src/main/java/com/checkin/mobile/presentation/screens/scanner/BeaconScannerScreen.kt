package com.checkin.mobile.presentation.screens.scanner

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.checkin.mobile.domain.model.Beacon

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeaconScannerScreen(
    viewModel: BeaconScannerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    // Request BLE permissions
    val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION
        )
    } else {
        arrayOf(
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN,
            Manifest.permission.ACCESS_FINE_LOCATION
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissionsResult ->
        val allGranted = permissionsResult.values.all { it }
        viewModel.setPermissionsGranted(allGranted)
        if (allGranted) {
            viewModel.startScanning()
        }
    }

    // Check and request permissions on launch
    LaunchedEffect(Unit) {
        permissionLauncher.launch(permissions)
    }

    // Stop scanning when leaving screen
    DisposableEffect(lifecycleOwner) {
        onDispose {
            viewModel.stopScanning()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Маяки рядом") },
                actions = {
                    IconButton(onClick = { /* TODO: Notifications */ }) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Уведомления",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF10B981),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF9FAFB))
        ) {
            // Status Card
            StatusCard(
                status = uiState.currentUserStatus,
                location = uiState.currentLocation,
                entryTime = uiState.lastEntryTime
            )

            // Scanning Status
            ScanningStatus(
                isScanning = uiState.isScanning,
                beaconsCount = uiState.activeBeaconsCount
            )

            // Beacons List
            if (!uiState.permissionsGranted) {
                PermissionsRequiredState(
                    onRequestPermissions = { permissionLauncher.launch(permissions) }
                )
            } else if (uiState.beacons.isEmpty()) {
                EmptyBeaconsState(isScanning = uiState.isScanning)
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.beacons) { beacon ->
                        BeaconItem(beacon = beacon)
                    }
                }
            }
        }
    }
}

@Composable
fun ScanningStatus(
    isScanning: Boolean,
    beaconsCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(if (isScanning) Color(0xFF10B981) else Color(0xFF9CA3AF))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (isScanning) "Сканирование..." else "Не сканируется",
                fontSize = 14.sp,
                color = Color(0xFF6B7280)
            )
        }
        
        Badge(
            containerColor = Color(0xFFD1FAE5),
            contentColor = Color(0xFF065F46)
        ) {
            Text(
                text = "$beaconsCount найдено",
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun StatusCard(
    status: String,
    location: String,
    entryTime: String?
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(Color(0xFF10B981), Color(0xFF059669))
                    ),
                    shape = RoundedCornerShape(16.dp)
                )
                .padding(20.dp)
        ) {
            Column {
                Text(
                    text = "Текущий статус",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = status,
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
                if (location.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = buildString {
                            append(location)
                            if (entryTime != null) {
                                append(" • ")
                                append(entryTime)
                            }
                        },
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
fun BeaconItem(beacon: Beacon) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Beacon Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFD1FAE5)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = null,
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Beacon Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = beacon.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF111827)
                )
                Text(
                    text = "Major: ${beacon.major}, Minor: ${beacon.minor}",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280)
                )
                Text(
                    text = "RSSI: ${beacon.rssi} dBm • ${String.format("%.1f", beacon.distance)}m",
                    fontSize = 12.sp,
                    color = Color(0xFF9CA3AF)
                )
            }

            // Signal Strength
            SignalStrengthIndicator(beacon.signalStrength)
        }
    }
}

@Composable
fun SignalStrengthIndicator(strength: Beacon.SignalStrength) {
    val (label, color) = when (strength) {
        Beacon.SignalStrength.EXCELLENT -> "Отличный" to Color(0xFF10B981)
        Beacon.SignalStrength.GOOD -> "Хороший" to Color(0xFF34D399)
        Beacon.SignalStrength.FAIR -> "Средний" to Color(0xFFFBBF24)
        Beacon.SignalStrength.WEAK -> "Слабый" to Color(0xFFEF4444)
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = color
        )
    }
}

@Composable
fun EmptyBeaconsState(isScanning: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(Color(0xFFF3F4F6)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Notifications,
                contentDescription = null,
                tint = Color(0xFF6B7280),
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = if (isScanning) "Поиск маяков..." else "Маяки не обнаружены",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF111827)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (isScanning) 
                "Приложение сканирует BLE устройства вокруг вас"
            else
                "Убедитесь, что BLE включен и вы находитесь в зоне действия маяков",
            fontSize = 14.sp,
            color = Color(0xFF6B7280),
            lineHeight = 20.sp
        )
    }
}

@Composable
fun PermissionsRequiredState(
    onRequestPermissions: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(Color(0xFFFEE2E2)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Notifications,
                contentDescription = null,
                tint = Color(0xFFEF4444),
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "Требуются разрешения",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF111827)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Для обнаружения BLE маяков необходимы разрешения на Bluetooth и местоположение",
            fontSize = 14.sp,
            color = Color(0xFF6B7280),
            lineHeight = 20.sp
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onRequestPermissions,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Разрешить", color = Color.White)
        }
    }
}
