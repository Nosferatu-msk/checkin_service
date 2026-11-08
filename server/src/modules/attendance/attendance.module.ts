import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AttendanceController, AdminAttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRaw } from './entities/attendance-raw.entity';
import { AttendanceCalculated } from './entities/attendance-calculated.entity';
import { Beacon } from '../beacons/entities/beacon.entity';
import { Zone } from '../zones/entities/zone.entity';
import { AttendanceWorker } from './workers/attendance.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRaw, AttendanceCalculated, Beacon, Zone]),
    BullModule.registerQueue({
      name: 'attendance-processing',
    }),
  ],
  controllers: [AttendanceController, AdminAttendanceController],
  providers: [AttendanceService, AttendanceWorker],
  exports: [AttendanceService],
})
export class AttendanceModule {}
