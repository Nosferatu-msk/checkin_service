import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Object } from '../objects/entities/object.entity';
import { Beacon } from '../beacons/entities/beacon.entity';
import { User } from '../users/entities/user.entity';
import { RequirementViolation } from '../sla/entities/requirement-violation.entity';
import { AttendanceCalculated } from '../attendance/entities/attendance-calculated.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Object,
      Beacon,
      User,
      RequirementViolation,
      AttendanceCalculated,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
