import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AttendanceController, AdminAttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRaw } from './entities/attendance-raw.entity';
import { AttendanceCalculated } from './entities/attendance-calculated.entity';
import { DevicePushToken } from './entities/device-push-token.entity';
import { Beacon } from '../beacons/entities/beacon.entity';
import { Zone } from '../zones/entities/zone.entity';
import { AttendanceWorker } from './workers/attendance.worker';
import { FraudModule } from '../fraud/fraud.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRaw, AttendanceCalculated, DevicePushToken, Beacon, Zone]),
    BullModule.registerQueue({
      name: 'attendance-processing',
    }),
    FraudModule,
    NotificationsModule,
  ],
  controllers: [AttendanceController, AdminAttendanceController],
  providers: [AttendanceService, AttendanceWorker],
  exports: [AttendanceService],
})
export class AttendanceModule {}
