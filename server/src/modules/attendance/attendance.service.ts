import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRaw } from './entities/attendance-raw.entity';
import { AttendanceCalculated } from './entities/attendance-calculated.entity';
import { DevicePushToken } from './entities/device-push-token.entity';
import { SubmitAttendanceDto, SubmitBeaconTelemetryDto } from './dto/attendance.dto';
import { Beacon } from '../beacons/entities/beacon.entity';
import { Zone } from '../zones/entities/zone.entity';
import { FraudService } from '../fraud/fraud.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRaw)
    private attendanceRawRepository: Repository<AttendanceRaw>,
    @InjectRepository(AttendanceCalculated)
    private attendanceCalculatedRepository: Repository<AttendanceCalculated>,
    @InjectRepository(Beacon)
    private beaconRepository: Repository<Beacon>,
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    @InjectRepository(DevicePushToken)
    private pushTokenRepository: Repository<DevicePushToken>,
    private readonly fraudService: FraudService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submitAttendance(userId: string, submitDto: SubmitAttendanceDto) {
    // Проверка на duplicate request (replay protection)
    const existingRequest = await this.attendanceRawRepository.findOne({
      where: { request_id: submitDto.request_id },
    });

    if (existingRequest) {
      throw new ConflictException('Запрос с таким request_id уже был обработан');
    }

    // Валидация и сохранение сырых записей
    const validRecords = [];
    
    for (const record of submitDto.records) {
      // Проверка активности маяка
      const beacon = await this.beaconRepository.findOne({
        where: { uuid: record.beacon_uuid, is_active: true },
      });

      if (!beacon) {
        this.logger.warn(`Beacon not found or inactive: ${record.beacon_uuid}`);
        continue;
      }

      // Проверка MAC-адреса (защита от клонирования)
      if (beacon.mac_address && record.mac_address !== beacon.mac_address) {
        this.logger.warn(`MAC address mismatch for beacon ${record.beacon_uuid}`);

        // Создание записи в fraud_log
        await this.fraudService.create({
          user_id: userId,
          fraud_type: 'beacon_clone_detected',
          severity: 'critical',
          details: {
            beacon_uuid: record.beacon_uuid,
            expected_mac: beacon.mac_address,
            actual_mac: record.mac_address,
            detected_at: new Date().toISOString(),
          },
        });

        // Уведомление администраторов
        await this.notificationsService.sendToAdmins(
          'fraud_alert',
          'Обнаружено клонирование маяка',
          `MAC mismatch для маяка ${record.beacon_uuid}: ожидаемый ${beacon.mac_address}, получен ${record.mac_address}`,
        );

        continue;
      }

      // Валидация timestamps
      const scanStart = new Date(record.scan_timestamp_start);
      const scanEnd = new Date(record.scan_timestamp_end);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (scanEnd > fiveMinutesFromNow || scanStart < twentyFourHoursAgo) {
        this.logger.warn(`Invalid timestamps for record`);
        continue;
      }

      // Валидация RSSI
      if (record.median_rssi < -100 || record.median_rssi > -30) {
        this.logger.warn(`Invalid RSSI value: ${record.median_rssi}`);
        continue;
      }

      // Сохранение сырой записи
      const rawRecord = this.attendanceRawRepository.create({
        user_id: userId,
        beacon_uuid: record.beacon_uuid,
        mac_address: record.mac_address,
        scan_timestamp_start: scanStart,
        scan_timestamp_end: scanEnd,
        median_rssi: record.median_rssi,
        min_rssi: record.min_rssi,
        max_rssi: record.max_rssi,
        samples_count: record.samples_count,
        device_fingerprint_hash: record.device_fingerprint,
        request_id: submitDto.request_id,
      });

      validRecords.push(rawRecord);
    }

    if (validRecords.length > 0) {
      await this.attendanceRawRepository.save(validRecords);
      this.logger.log(`Saved ${validRecords.length} raw attendance records`);
    }

    return {
      accepted: validRecords.length,
      synced_at: new Date().toISOString(),
    };
  }

  async getAllAttendance(
    from?: Date,
    to?: Date,
    userId?: string,
    objectId?: string,
  ) {
    const queryBuilder = this.attendanceRawRepository.createQueryBuilder('attendance');

    if (from) {
      queryBuilder.andWhere('attendance.scan_timestamp_start >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('attendance.scan_timestamp_end <= :to', { to });
    }

    if (userId) {
      queryBuilder.andWhere('attendance.user_id = :userId', { userId });
    }

    // Если нужен фильтр по object_id, фильтруем через beacon -> zone
    if (objectId) {
      queryBuilder
        .innerJoin('beacons', 'beacon', 'beacon.uuid = attendance.beacon_uuid')
        .innerJoin('zones', 'zone', 'zone.id = beacon.zone_id')
        .andWhere('zone.object_id = :objectId', { objectId });
    }

    const records = await queryBuilder
      .orderBy('attendance.scan_timestamp_start', 'DESC')
      .getMany();

    return { data: records };
  }

  async submitBeaconTelemetry(telemetryDto: SubmitBeaconTelemetryDto) {
    let accepted = 0;

    for (const telemetry of telemetryDto.beacons) {
      const beacon = await this.beaconRepository.findOne({
        where: { uuid: telemetry.beacon_uuid },
      });

      if (beacon) {
        beacon.battery_level = telemetry.battery_level;
        beacon.last_seen_at = new Date(telemetry.last_seen_at);
        await this.beaconRepository.save(beacon);
        accepted++;
      }
    }

    return { accepted };
  }

  async getMyAttendance(userId: string, from?: Date, to?: Date) {
    const queryBuilder = this.attendanceCalculatedRepository.createQueryBuilder('attendance')
      .where('attendance.user_id = :userId', { userId });

    if (from) {
      queryBuilder.andWhere('attendance.enter_time >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('attendance.enter_time < :to', { to });
    }

    const records = await queryBuilder
      .leftJoinAndSelect('attendance.zone', 'zone')
      .orderBy('attendance.enter_time', 'DESC')
      .getMany();

    return { data: records };
  }

  async savePushToken(userId: string, pushToken: string, platform: 'android' | 'ios' | 'web') {
    // Ищем существующий токен
    let tokenEntity = await this.pushTokenRepository.findOne({
      where: { push_token: pushToken },
    });

    if (tokenEntity) {
      // Токен уже существует - обновляем user_id, platform и активируем
      tokenEntity.user_id = userId;
      tokenEntity.platform = platform;
      tokenEntity.is_active = true;
      await this.pushTokenRepository.save(tokenEntity);
      this.logger.log(`Updated push token for user ${userId}`);
    } else {
      // Создаём новую запись
      tokenEntity = this.pushTokenRepository.create({
        user_id: userId,
        push_token: pushToken,
        platform,
        is_active: true,
      });
      await this.pushTokenRepository.save(tokenEntity);
      this.logger.log(`Created new push token for user ${userId}`);
    }

    return {
      message: 'Токен зарегистрирован',
      user_id: userId,
      platform,
    };
  }

  async removePushToken(userId: string, pushToken?: string) {
    if (pushToken) {
      // Удаляем конкретный токен
      const result = await this.pushTokenRepository.delete({
        user_id: userId,
        push_token: pushToken,
      });
      this.logger.log(`Removed push token for user ${userId}`);
      return { deleted: result.affected || 0 };
    } else {
      // Удаляем все токены пользователя
      const result = await this.pushTokenRepository.delete({ user_id: userId });
      this.logger.log(`Removed all push tokens for user ${userId}`);
      return { deleted: result.affected || 0 };
    }
  }

  async getActiveBeaconUuids(): Promise<string[]> {
    const allowedBeacons = await this.beaconRepository.find({
      where: { is_active: true },
      select: { uuid: true },
    });
    return allowedBeacons.map((b) => b.uuid);
  }
}
