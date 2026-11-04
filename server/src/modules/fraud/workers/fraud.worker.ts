import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { FraudLog } from '../entities/fraud-log.entity';
import { AttendanceCalculated } from '../../attendance/entities/attendance-calculated.entity';

@Processor('fraud-detection')
export class FraudWorker {
  private readonly logger = new Logger(FraudWorker.name);

  constructor(
    @InjectRepository(FraudLog)
    private fraudLogRepository: Repository<FraudLog>,
    @InjectRepository(AttendanceCalculated)
    private attendanceRepository: Repository<AttendanceCalculated>,
  ) {}

  @Process('detect-fraud')
  async detectFraud(job: Job<{ userId: string; attendanceId: number }>) {
    const { userId, attendanceId } = job.data;
    
    this.logger.log(`Running fraud detection for user ${userId}`);

    try {
      // Получаем текущую запись присутствия
      const currentAttendance = await this.attendanceRepository.findOne({
        where: { id: attendanceId },
      });

      if (!currentAttendance) {
        return { detected: 0 };
      }

      let detectedCount = 0;

      // 1. Детекция телепортации (перемещение < 5 минут между объектами)
      const teleportationDetected = await this.detectTeleportation(userId, currentAttendance);
      if (teleportationDetected) detectedCount++;

      // 2. Детекция одновременного присутствия
      const simultaneousDetected = await this.detectSimultaneousPresence(userId, currentAttendance);
      if (simultaneousDetected) detectedCount++;

      this.logger.log(`Fraud detection completed for user ${userId}. Detected: ${detectedCount}`);
      return { detected: detectedCount };
    } catch (error) {
      this.logger.error(`Error detecting fraud: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async detectTeleportation(userId: string, currentAttendance: AttendanceCalculated): Promise<boolean> {
    // Получаем предыдущую запись пользователя
    const previousAttendance = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.zone', 'zone')
      .leftJoin('zone.object', 'object')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('attendance.exit_time < :enterTime', { enterTime: currentAttendance.enter_time })
      .orderBy('attendance.exit_time', 'DESC')
      .getOne();

    if (!previousAttendance) {
      return false;
    }

    // Проверяем разницу во времени
    const timeDiffMinutes = 
      (currentAttendance.enter_time.getTime() - previousAttendance.exit_time.getTime()) / 60000;

    if (timeDiffMinutes < 5) {
      // Проверяем, разные ли это объекты
      const currentZone = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect('attendance.zone', 'zone')
        .leftJoinAndSelect('zone.object', 'object')
        .where('attendance.id = :id', { id: currentAttendance.id })
        .getOne();

      const previousZone = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect('attendance.zone', 'zone')
        .leftJoinAndSelect('zone.object', 'object')
        .where('attendance.id = :id', { id: previousAttendance.id })
        .getOne();

      if (currentZone?.zone?.object_id !== previousZone?.zone?.object_id) {
        // Телепортация обнаружена!
        await this.fraudLogRepository.save({
          user_id: userId,
          fraud_type: 'teleportation',
          severity: 'critical',
          details: {
            from_zone: previousZone?.zone?.name,
            from_object: previousZone?.zone?.object?.name,
            to_zone: currentZone?.zone?.name,
            to_object: currentZone?.zone?.object?.name,
            time_diff_minutes: Math.round(timeDiffMinutes),
            previous_exit: previousAttendance.exit_time,
            current_enter: currentAttendance.enter_time,
          },
        });

        this.logger.warn(`Teleportation detected for user ${userId}: ${timeDiffMinutes} minutes`);
        return true;
      }
    }

    return false;
  }

  private async detectSimultaneousPresence(userId: string, currentAttendance: AttendanceCalculated): Promise<boolean> {
    // Проверяем, есть ли другие активные сессии пользователя в это время
    const overlappingAttendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.zone', 'zone')
      .leftJoinAndSelect('zone.object', 'object')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('attendance.id != :currentId', { currentId: currentAttendance.id })
      .andWhere('attendance.enter_time < :exitTime', { exitTime: currentAttendance.exit_time })
      .andWhere('attendance.exit_time > :enterTime', { enterTime: currentAttendance.enter_time })
      .getMany();

    if (overlappingAttendances.length > 0) {
      // Проверяем, разные ли это объекты
      const currentZone = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect('attendance.zone', 'zone')
        .leftJoinAndSelect('zone.object', 'object')
        .where('attendance.id = :id', { id: currentAttendance.id })
        .getOne();

      for (const overlapping of overlappingAttendances) {
        if (overlapping.zone?.object_id !== currentZone?.zone?.object_id) {
          // Одновременное присутствие на разных объектах!
          await this.fraudLogRepository.save({
            user_id: userId,
            fraud_type: 'simultaneous_presence',
            severity: 'critical',
            details: {
              zone_1: currentZone?.zone?.name,
              object_1: currentZone?.zone?.object?.name,
              enter_time_1: currentAttendance.enter_time,
              zone_2: overlapping.zone?.name,
              object_2: overlapping.zone?.object?.name,
              enter_time_2: overlapping.enter_time,
            },
          });

          this.logger.warn(`Simultaneous presence detected for user ${userId}`);
          return true;
        }
      }
    }

    return false;
  }
}
