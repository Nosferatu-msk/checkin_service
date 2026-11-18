package com.checkin.mobile.presentation.screens.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HistoryRecord(
    val id: String,
    val date: String,
    val entryTime: String,
    val exitTime: String?,
    val location: String,
    val duration: String,
    val beaconsDetected: Int
)

data class HistoryUiState(
    val records: List<HistoryRecord> = emptyList(),
    val selectedPeriod: HistoryPeriod = HistoryPeriod.WEEK,
    val totalHours: String = "0ч",
    val totalDays: Int = 0
)

enum class HistoryPeriod(val label: String, val days: Int) {
    WEEK("7 дней", 7),
    MONTH("30 дней", 30)
}

@HiltViewModel
class HistoryViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    init {
        loadMockHistory()
    }

    private fun loadMockHistory() {
        viewModelScope.launch {
            val mockRecords = listOf(
                HistoryRecord(
                    id = "1",
                    date = "Сегодня",
                    entryTime = "09:00",
                    exitTime = null,
                    location = "БЦ \"Москва\"",
                    duration = "Текущий",
                    beaconsDetected = 3
                ),
                HistoryRecord(
                    id = "2",
                    date = "Вчера",
                    entryTime = "08:45",
                    exitTime = "18:30",
                    location = "БЦ \"Москва\"",
                    duration = "9ч 45м",
                    beaconsDetected = 5
                ),
                HistoryRecord(
                    id = "3",
                    date = "10 ноября",
                    entryTime = "09:15",
                    exitTime = "17:00",
                    location = "БЦ \"Москва\"",
                    duration = "7ч 45м",
                    beaconsDetected = 4
                ),
                HistoryRecord(
                    id = "4",
                    date = "9 ноября",
                    entryTime = "08:30",
                    exitTime = "19:00",
                    location = "БЦ \"Москва\"",
                    duration = "10ч 30м",
                    beaconsDetected = 6
                ),
                HistoryRecord(
                    id = "5",
                    date = "8 ноября",
                    entryTime = "09:00",
                    exitTime = "18:00",
                    location = "БЦ \"Москва\"",
                    duration = "9ч 00м",
                    beaconsDetected = 3
                )
            )

            _uiState.update {
                it.copy(
                    records = mockRecords,
                    totalHours = "46ч 30м",
                    totalDays = 5
                )
            }
        }
    }

    fun selectPeriod(period: HistoryPeriod) {
        _uiState.update { it.copy(selectedPeriod = period) }
    }
}
