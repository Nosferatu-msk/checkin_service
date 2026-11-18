package com.checkin.mobile.presentation.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("История") },
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
            // Period Selector
            PeriodSelector(
                selectedPeriod = uiState.selectedPeriod,
                onPeriodSelected = { viewModel.selectPeriod(it) }
            )

            // Summary Card
            SummaryCard(
                totalHours = uiState.totalHours,
                totalDays = uiState.totalDays
            )

            // Header
            Text(
                text = "Последние посещения",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF111827),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            // History List
            LazyColumn(
                modifier = Modifier.fillMaxSize()
            ) {
                items(uiState.records) { record ->
                    HistoryItem(record = record)
                }
            }
        }
    }
}

@Composable
fun PeriodSelector(
    selectedPeriod: HistoryPeriod,
    onPeriodSelected: (HistoryPeriod) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        HistoryPeriod.values().forEach { period ->
            val isSelected = period == selectedPeriod
            FilterChip(
                selected = isSelected,
                onClick = { onPeriodSelected(period) },
                label = { Text(period.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF10B981),
                    selectedLabelColor = Color.White,
                    containerColor = Color.White,
                    labelColor = Color(0xFF6B7280)
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = Color(0xFFE5E7EB),
                    selectedBorderColor = Color(0xFF10B981),
                    enabled = true,
                    selected = isSelected
                )
            )
        }
    }
}

@Composable
fun SummaryCard(
    totalHours: String,
    totalDays: Int
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = totalHours,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF10B981)
                )
                Text(
                    text = "Всего часов",
                    fontSize = 12.sp,
                    color = Color(0xFF6B7280)
                )
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(40.dp)
                    .background(Color(0xFFE5E7EB))
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "$totalDays",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF10B981)
                )
                Text(
                    text = "Дней",
                    fontSize = 12.sp,
                    color = Color(0xFF6B7280)
                )
            }
        }
    }
}

@Composable
fun HistoryItem(record: HistoryRecord) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Date and Duration
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = record.date,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF111827)
                )
                Text(
                    text = record.duration,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF10B981)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Вход: ${record.entryTime}",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280)
                )
                Text(
                    text = "Выход: ${record.exitTime ?: "—"}",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280)
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Location
            Text(
                text = record.location,
                fontSize = 13.sp,
                color = Color(0xFF9CA3AF)
            )

            // Beacons count
            Text(
                text = "Обнаружено маяков: ${record.beaconsDetected}",
                fontSize = 12.sp,
                color = Color(0xFF9CA3AF)
            )
        }
    }
}
