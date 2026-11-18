package com.checkin.mobile.domain.model

data class Beacon(
    val id: String,
    val name: String,
    val major: Int,
    val minor: Int,
    val rssi: Int,
    val distance: Double,
    val is_active: Boolean = true,
    val location: String = "",
    val lastSeen: Long = System.currentTimeMillis()
) {
    val signalStrength: SignalStrength
        get() = when {
            rssi >= -50 -> SignalStrength.EXCELLENT
            rssi >= -70 -> SignalStrength.GOOD
            rssi >= -80 -> SignalStrength.FAIR
            else -> SignalStrength.WEAK
        }

    enum class SignalStrength(val label: String, val color: Long) {
        EXCELLENT("Отличный", 0xFF10B981),
        GOOD("Хороший", 0xFF34D399),
        FAIR("Средний", 0xFFFBBF24),
        WEAK("Слабый", 0xFFEF4444)
    }
}
