import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { ZoneRequirement } from './entities/zone-requirement.entity';
import { RequirementViolation } from './entities/requirement-violation.entity';
import { AttendanceCalculated } from '../attendance/entities/attendance-calculated.entity';
import { SlaWorker } from './workers/sla.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZoneRequirement, RequirementViolation, AttendanceCalculated]),
    BullModule.registerQueue({
      name: 'sla-checking',
    }),
  ],
  controllers: [SlaController],
  providers: [SlaService, SlaWorker],
  exports: [SlaService],
})
export class SlaModule {}
