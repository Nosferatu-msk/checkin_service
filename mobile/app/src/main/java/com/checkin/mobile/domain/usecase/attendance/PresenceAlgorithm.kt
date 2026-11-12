package com.checkin.mobile.domain.usecase.attendance

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Замер RSSI с временной меткой.
 * Используется алгоритмом определения присутствия как входные данные.
 */
data class RssiSample(
    val rssi: Int,
    val timestamp: Long
)

/**
 * Результат проверки присутствия.
 */
data class PresenceResult(
    val isPresent: Boolean,
    val medianRssi: Int,
    val filteredSamplesCount: Int,
    val reason: String
)

/**
 * Алгоритм определения присутствия сотрудника в зоне действия BLE-маяка.
 *
 * Согласно ТЗ (раздел 6.2):
 * - Минимум 3 замера RSSI за интервал агрегации
 * - Замеры должны быть распределены по интервалу (минимальная длительность ≥ 30 секунд)
 * - Фильтр выбросов 10% (отбросить крайние 10% значений)
 * - Вычислить медиану RSSI
 * - RSSI должен быть выше порога
 *
 * Является чистой функцией — не имеет побочных эффектов, легко тестируется.
 */
@Singleton
class PresenceAlgorithm @Inject constructor() {

    companion object {
        /** Минимальное количество замеров для определения присутствия */
        const val DEFAULT_MIN_SAMPLES = 3

        /** Процент отбрасываемых крайних значений (фильтр выбросов) */
        const val DEFAULT_OUTLIER_PERCENT = 0.1

        /** Минимальная суммарная длительность замеров (мс) */
        const val DEFAULT_MIN_DURATION_MS = 30_000L // 30 секунд

        /** Порог RSSI по умолчанию (dBm). Слабый сигнал. */
        const val DEFAULT_RSSI_THRESHOLD = -100
    }

    /**
     * Определить присутствие на основе агрегированных замеров RSSI.
     *
     * @param samples Список замеров RSSI с timestamps (должен быть отсортирован по timestamp)
     * @param minSamples Минимальное количество замеров
     * @param intervalMs Интервал агрегации в миллисекундах
     * @param rssiThreshold Порог RSSI (значения ниже считаются "слишком далеко")
     * @return [PresenceResult] с результатом проверки и медианой RSSI
     */
    fun evaluate(
        samples: List<RssiSample>,
        minSamples: Int = DEFAULT_MIN_SAMPLES,
        intervalMs: Long = 600_000L,
        rssiThreshold: Int = DEFAULT_RSSI_THRESHOLD
    ): PresenceResult {
        // 1. Проверить минимальное количество замеров
        if (samples.size < minSamples) {
            return PresenceResult(
                isPresent = false,
                medianRssi = 0,
                filteredSamplesCount = 0,
                reason = "Недостаточно замеров: ${samples.size} < $minSamples"
            )
        }

        // 2. Отфильтровать замеры по порогу RSSI
        val aboveThreshold = samples.filter { it.rssi > rssiThreshold }
        if (aboveThreshold.size < minSamples) {
            return PresenceResult(
                isPresent = false,
                medianRssi = 0,
                filteredSamplesCount = aboveThreshold.size,
                reason = "Недостаточно замеров выше порога ($rssiThreshold): ${aboveThreshold.size} < $minSamples"
            )
        }

        // 3. Проверить минимальную длительность (сумма интервалов между замерами ≥ 30 сек)
        val sortedByTime = aboveThreshold.sortedBy { it.timestamp }
        val duration = sortedByTime.last().timestamp - sortedByTime.first().timestamp
        if (duration < DEFAULT_MIN_DURATION_MS) {
            return PresenceResult(
                isPresent = false,
                medianRssi = 0,
                filteredSamplesCount = sortedByTime.size,
                reason = "Малая длительность: ${duration}мс < ${DEFAULT_MIN_DURATION_MS}мс"
            )
        }

        // 4. Проверить распределение по интервалу (покрытие ≥ 50% интервала агрегации)
        val minCoverage = (intervalMs * 0.5).toLong()
        if (duration < minCoverage) {
            return PresenceResult(
                isPresent = false,
                medianRssi = 0,
                filteredSamplesCount = sortedByTime.size,
                reason = "Замеры слишком кучные: покрытие ${duration}мс < ${minCoverage}мс (50% интервала)"
            )
        }

        // 5. Фильтр выбросов 10% (отбросить крайние 10% значений RSSI)
        val filteredSamples = filterOutliers(sortedByTime, DEFAULT_OUTLIER_PERCENT)

        // 6. Проверить, что после фильтрации осталось достаточно замеров
        if (filteredSamples.size < minSamples) {
            return PresenceResult(
                isPresent = false,
                medianRssi = 0,
                filteredSamplesCount = filteredSamples.size,
                reason = "После фильтрации выбросов недостаточно замеров: ${filteredSamples.size} < $minSamples"
            )
        }

        // 7. Вычислить медиану RSSI
        val medianRssi = calculateMedianRssi(filteredSamples)

        return PresenceResult(
            isPresent = true,
            medianRssi = medianRssi,
            filteredSamplesCount = filteredSamples.size,
            reason = "Присутствие подтверждено: ${filteredSamples.size} замеров, длительность ${duration}мс"
        )
    }

    /**
     * Вычислить медиану RSSI после фильтрации выбросов.
     *
     * @param samples Список замеров (не обязательно отсортированный)
     * @param outlierPercent Процент отбрасываемых крайних значений
     * @return Медианное значение RSSI, или 0 если нет данных
     */
    fun calculateMedianRssi(
        samples: List<RssiSample>,
        outlierPercent: Double = DEFAULT_OUTLIER_PERCENT
    ): Int {
        if (samples.isEmpty()) return 0

        val filteredSamples = filterOutliers(samples, outlierPercent)
        if (filteredSamples.isEmpty()) return 0

        return computeMedian(filteredSamples.map { it.rssi })
    }

    /**
     * Фильтр выбросов — отбросить крайние outlierPercent значений RSSI.
     * Сортирует по RSSI и удаляет нижние и верхние outlierPercent записей.
     *
     * @param samples Список замеров
     * @param outlierPercent Доля отбрасываемых значений (0.0 .. 0.5)
     * @return Отфильтрованный список замеров
     */
    internal fun filterOutliers(
        samples: List<RssiSample>,
        outlierPercent: Double
    ): List<RssiSample> {
        if (samples.size < 3) return samples

        val sorted = samples.sortedBy { it.rssi }
        val removeCount = (sorted.size * outlierPercent).toInt()

        if (removeCount == 0) return samples

        // Отбросить нижние и верхние outlierPercent значений
        return sorted.subList(
            fromIndex = removeCount,
            toIndex = sorted.size - removeCount
        )
    }

    /**
     * Вычислить медиану списка целых чисел.
     */
    private fun computeMedian(values: List<Int>): Int {
        val sorted = values.sorted()
        val middle = sorted.size / 2

        return if (sorted.size % 2 == 0) {
            // Для чётного количества — среднее двух центральных
            (sorted[middle - 1] + sorted[middle]) / 2
        } else {
            // Для нечётного — центральное значение
            sorted[middle]
        }
    }
}
