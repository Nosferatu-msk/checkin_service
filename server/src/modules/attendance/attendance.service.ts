import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRaw } from './entities/attendance-raw.entity';
import { AttendanceCalculated } from './entities/attendance-calculated.entity';
import { SubmitAttendanceDto, SubmitBeaconTelemetryDto } from './dto/attendance.dto';
import { Beacon } from '../beacons/entities/beacon.entity';
import { Zone } from '../zones/entities/zone.entity';

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
        // TODO: Логировать фрод-событие
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
}
