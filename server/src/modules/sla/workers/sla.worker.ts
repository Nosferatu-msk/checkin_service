import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZoneRequirement } from '../entities/zone-requirement.entity';
import { RequirementViolation } from '../entities/requirement-violation.entity';
import { AttendanceCalculated } from '../../attendance/entities/attendance-calculated.entity';

@Processor('sla-checking')
export class SlaWorker {
  private readonly logger = new Logger(SlaWorker.name);

  constructor(
    @InjectRepository(ZoneRequirement)
    private requirementRepository: Repository<ZoneRequirement>,
    @InjectRepository(RequirementViolation)
    private violationRepository: Repository<RequirementViolation>,
    @InjectRepository(AttendanceCalculated)
    private attendanceRepository: Repository<AttendanceCalculated>,
  ) {}

  @Process('check-sla-compliance')
  async checkSlaCompliance(job: Job) {
    this.logger.log(`Starting SLA compliance check`);

    try {
      // Получаем все активные нормативы
      const requirements = await this.requirementRepository.find({
        where: { is_active: true },
        relations: ['zone', 'contract'],
      });

      let violationsCreated = 0;

      for (const requirement of requirements) {
        // Определение периода проверки (ПРОШЕДШИЙ период)
        const periodDate = this.getPreviousPeriodDate(requirement.period_type);

        // Проверка, нужно ли проверять сегодня
        if (!this.shouldCheckToday(requirement, periodDate)) {
          continue;
        }

        // Получение количества уникальных сотрудников
        const uniqueEmployees = await this.getUniqueEmployeesCount(
          requirement.zone_id,
          periodDate,
          1, // Минимум 1 минута
        );

        // Проверка нарушения
        if (uniqueEmployees < requirement.visits_count) {
          // Создание записи о нарушении
          const violation = this.violationRepository.create({
            requirement_id: requirement.id,
            period_date: periodDate,
            required_count: requirement.visits_count,
            actual_count: uniqueEmployees,
            deficit: requirement.visits_count - uniqueEmployees,
            details: {
              zone_name: requirement.zone?.name,
              contract_name: requirement.contract?.name,
            },
          });

          await this.violationRepository.save(violation);
          violationsCreated++;

          this.logger.warn(
            `SLA violation: zone "${requirement.zone?.name}" required ${requirement.visits_count}, actual ${uniqueEmployees}`
          );
        }
      }

      this.logger.log(`SLA check completed. Violations created: ${violationsCreated}`);
      return { violationsCreated };
    } catch (error) {
      this.logger.error(`Error checking SLA: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getPreviousPeriodDate(periodType: string): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (periodType === 'daily') {
      // Вчера
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    } else if (periodType === 'weekly') {
      // Начало прошлой недели (понедельник)
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - today.getDay() - 6);
      return lastMonday;
    } else if (periodType === 'monthly') {
      // Начало прошлого месяца
      const firstDayOfLastMonth = new Date(today);
      firstDayOfLastMonth.setMonth(today.getMonth() - 1, 1);
      return firstDayOfLastMonth;
    }

    return today;
  }

  private shouldCheckToday(requirement: ZoneRequirement, periodDate: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requirement.period_type === 'daily') {
      // Проверка битовой маски дней недели
      const weekday = periodDate.getDay(); // 0 = Sunday, 1 = Monday, ...
      const bitIndex = weekday === 0 ? 6 : weekday - 1; // Преобразуем в формат пн=0, вс=6
      return (requirement.weekdays_mask & (1 << bitIndex)) !== 0;
    } else if (requirement.period_type === 'weekly') {
      // Запуск в понедельник
      return today.getDay() === 1;
    } else if (requirement.period_type === 'monthly') {
      // Запуск 1-го числа
      return today.getDate() === 1;
    }

    return false;
  }

  private async getUniqueEmployeesCount(
    zoneId: string,
    periodDate: Date,
    minDurationMinutes: number,
  ): Promise<number> {
    const periodEnd = new Date(periodDate);
    periodEnd.setDate(periodEnd.getDate() + 1);

    // Рекурсивный запрос для учёта иерархии зон
    const result = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('COUNT(DISTINCT attendance.user_id)', 'count')
      .where('attendance.zone_id IN (SELECT id FROM zones WHERE path <@ (SELECT path FROM zones WHERE id = :zoneId)::ltree)', { zoneId })
      .andWhere('attendance.enter_time >= :periodStart', { periodStart: periodDate })
      .andWhere('attendance.enter_time < :periodEnd', { periodEnd })
      .andWhere('attendance.duration_minutes >= :minDuration', { minDuration: minDurationMinutes })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }
}
