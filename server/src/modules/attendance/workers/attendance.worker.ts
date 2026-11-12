import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRaw } from '../entities/attendance-raw.entity';
import { AttendanceCalculated } from '../entities/attendance-calculated.entity';
import { Beacon } from '../../beacons/entities/beacon.entity';
import { Zone } from '../../zones/entities/zone.entity';
import { FraudService } from '../../fraud/fraud.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('attendance-processing')
export class AttendanceWorker {
  private readonly logger = new Logger(AttendanceWorker.name);

  constructor(
    @InjectRepository(AttendanceRaw)
    private attendanceRawRepository: Repository<AttendanceRaw>,
    @InjectRepository(AttendanceCalculated)
    private attendanceCalculatedRepository: Repository<AttendanceCalculated>,
    @InjectRepository(Beacon)
    private beaconRepository: Repository<Beacon>,
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    private readonly fraudService: FraudService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Process('process-raw-attendance')
  async processRawAttendance(job: Job) {
    this.logger.log(`Processing attendance job ${job.id}`);

    try {
      // Получаем необработанные записи за последние 10 минут
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const rawRecords = await this.attendanceRawRepository
        .createQueryBuilder('raw')
        .where('raw.synced_at >= :tenMinutesAgo', { tenMinutesAgo })
        .orderBy('raw.user_id, raw.beacon_uuid, raw.scan_timestamp_start')
        .getMany();

      if (rawRecords.length === 0) {
        this.logger.log('No raw records to process');
        return { processed: 0 };
      }

      // Группировка по user_id и beacon_uuid
      const grouped = this.groupByUserAndBeacon(rawRecords);

      let processedCount = 0;

      for (const [key, records] of Object.entries(grouped)) {
        const [userId, beaconUuid] = key.split('|');

        // Валидация: минимум 3 записи
        if (records.length < 3) {
          this.logger.debug(`Skipping ${userId}/${beaconUuid}: insufficient samples (${records.length})`);
          continue;
        }

        // Проверка активности маяка
        const beacon = await this.beaconRepository.findOne({
          where: { uuid: beaconUuid, is_active: true },
        });

        if (!beacon) {
          this.logger.debug(`Beacon ${beaconUuid} not found or inactive`);
          continue;
        }

        // Проверка MAC-адреса (защита от клонирования)
        const macMismatch = records.find(
          (r) => beacon.mac_address && r.mac_address && r.mac_address !== beacon.mac_address
        );

        if (macMismatch) {
          this.logger.warn(`MAC mismatch for beacon ${beaconUuid}: expected ${beacon.mac_address}, got ${macMismatch.mac_address}`);

          // Создание записи в fraud_log
          await this.fraudService.create({
            user_id: userId,
            fraud_type: 'beacon_clone_detected',
            severity: 'critical',
            details: {
              beacon_uuid: beaconUuid,
              expected_mac: beacon.mac_address,
              actual_mac: macMismatch.mac_address,
              detected_at: new Date().toISOString(),
            },
          });

          // Уведомление администраторов
          await this.notificationsService.sendToAdmins(
            'fraud_alert',
            'Обнаружено клонирование маяка',
            `MAC mismatch для маяка ${beaconUuid}: ожидаемый ${beacon.mac_address}, получен ${macMismatch.mac_address}`,
          );

          continue;
        }

        // Получение зоны
        const zone = await this.zoneRepository.findOne({
          where: { id: beacon.zone_id },
        });

        if (!zone) {
          this.logger.warn(`Zone not found for beacon ${beaconUuid}`);
          continue;
        }

        // Группировка по сессиям (5-минутное окно)
        const sessions = this.groupBySessions(records, 5);

        for (const session of sessions) {
          const enterTime = new Date(Math.min(...session.map((r) => r.scan_timestamp_start.getTime())));
          const exitTime = new Date(Math.max(...session.map((r) => r.scan_timestamp_end.getTime())));
          
          // Расчёт длительности (время сессии)
          const durationMinutes = (exitTime.getTime() - enterTime.getTime()) / 60000;

          // Расчёт RSSI с фильтрацией выбросов
          const avgRssi = this.calculateFilteredRssi(session);

          // Проверка порога RSSI (с наследованием)
          const threshold = zone.rssi_threshold || (await this.getInheritedThreshold(zone));
          
          if (avgRssi < threshold) {
            this.logger.debug(`RSSI ${avgRssi} below threshold ${threshold} for zone ${zone.id}`);
            continue;
          }

          // Сохранение рассчитанного присутствия
          const calculated = this.attendanceCalculatedRepository.create({
            user_id: userId,
            zone_id: zone.id,
            enter_time: enterTime,
            exit_time: exitTime,
            duration_minutes: Math.round(durationMinutes),
            avg_rssi: avgRssi,
          });

          await this.attendanceCalculatedRepository.save(calculated);
          processedCount++;
        }
      }

      this.logger.log(`Processed ${processedCount} attendance records`);
      return { processed: processedCount };
    } catch (error) {
      this.logger.error(`Error processing attendance: ${error.message}`, error.stack);
      throw error;
    }
  }

  private groupByUserAndBeacon(records: AttendanceRaw[]): Record<string, AttendanceRaw[]> {
    const grouped: Record<string, AttendanceRaw[]> = {};

    for (const record of records) {
      const key = `${record.user_id}|${record.beacon_uuid}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(record);
    }

    return grouped;
  }

  private groupBySessions(records: AttendanceRaw[], gapMinutes: number): AttendanceRaw[][] {
    const sorted = [...records].sort(
      (a, b) => a.scan_timestamp_start.getTime() - b.scan_timestamp_start.getTime()
    );

    const sessions: AttendanceRaw[][] = [];
    let currentSession: AttendanceRaw[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = currentSession[currentSession.length - 1];
      const curr = sorted[i];
      
      const gap = (curr.scan_timestamp_start.getTime() - prev.scan_timestamp_end.getTime()) / 60000;

      if (gap <= gapMinutes) {
        currentSession.push(curr);
      } else {
        sessions.push(currentSession);
        currentSession = [curr];
      }
    }

    sessions.push(currentSession);
    return sessions;
  }

  private calculateFilteredRssi(records: AttendanceRaw[]): number {
    if (records.length === 0) return 0;

    // Сортировка по RSSI
    const sorted = [...records].sort((a, b) => a.median_rssi - b.median_rssi);

    // Отбрасываем крайние 10%
    const trimCount = Math.max(1, Math.floor(sorted.length * 0.1));
    const trimmed = sorted.length > 2 ? sorted.slice(trimCount, -trimCount) : sorted;

    // Медиана
    const middle = Math.floor(trimmed.length / 2);
    if (trimmed.length % 2 === 0) {
      return (trimmed[middle - 1].median_rssi + trimmed[middle].median_rssi) / 2;
    } else {
      return trimmed[middle].median_rssi;
    }
  }

  private async getInheritedThreshold(zone: Zone): Promise<number> {
    if (zone.rssi_threshold) {
      return zone.rssi_threshold;
    }

    if (zone.parent_zone_id) {
      const parent = await this.zoneRepository.findOne({
        where: { id: zone.parent_zone_id },
      });

      if (parent) {
        return this.getInheritedThreshold(parent);
      }
    }

    return -75.0; // Дефолтное значение
  }
}
