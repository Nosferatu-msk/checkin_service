import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { FraudLog } from './entities/fraud-log.entity';
import { AttendanceCalculated } from '../attendance/entities/attendance-calculated.entity';
import { FraudWorker } from './workers/fraud.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([FraudLog, AttendanceCalculated]),
    BullModule.registerQueue({
      name: 'fraud-detection',
    }),
  ],
  controllers: [FraudController],
  providers: [FraudService, FraudWorker],
  exports: [FraudService],
})
export class FraudModule {}
