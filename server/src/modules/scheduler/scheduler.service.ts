import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('attendance-processing')
    private attendanceQueue: Queue,
    @InjectQueue('sla-checking')
    private slaQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log('Scheduler service initialized');
  }

  // Каждые 10 минут — обработка присутствия
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAttendanceProcessing() {
    this.logger.log('Starting attendance processing job');
    
    try {
      await this.attendanceQueue.add('process-raw-attendance', {}, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
      
      this.logger.log('Attendance processing job queued');
    } catch (error) {
      this.logger.error(`Error queueing attendance processing: ${error.message}`);
    }
  }

  // Каждый час — проверка SLA (на самом деле должна запускаться ежедневно в 00:30)
  @Cron(CronExpression.EVERY_HOUR)
  async handleSlaChecking() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Запускаем только в 00:30
    if (hour === 0 && minute >= 30 && minute < 35) {
      this.logger.log('Starting SLA compliance check job');
      
      try {
        await this.slaQueue.add('check-sla-compliance', {}, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
        
        this.logger.log('SLA check job queued');
      } catch (error) {
        this.logger.error(`Error queueing SLA check: ${error.message}`);
      }
    }
  }
}
