import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectEntity } from '../objects/entities/object.entity';
import { Beacon } from '../beacons/entities/beacon.entity';
import { User } from '@/modules/users/entities/user.entity';
import { RequirementViolation } from '../sla/entities/requirement-violation.entity';
import { AttendanceCalculated } from '../attendance/entities/attendance-calculated.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ObjectEntity)
    private objectRepository: Repository<ObjectEntity>,
    @InjectRepository(Beacon)
    private beaconRepository: Repository<Beacon>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RequirementViolation)
    private violationRepository: Repository<RequirementViolation>,
    @InjectRepository(AttendanceCalculated)
    private attendanceRepository: Repository<AttendanceCalculated>,
  ) {}

  async getDashboardData(userId: string, userRole: string) {
    const objectsCount = await this.objectRepository.count({ where: { is_active: true } });
    const beaconsCount = await this.beaconRepository.count({ where: { is_active: true } });
    const employeesCount = await this.userRepository.count({ 
      where: { is_active: true, role: 'employee' } 
    });
    
    const slaViolations = await this.violationRepository.count();

    // Топ нарушений SLA по зонам
    const topSlaViolations = await this.violationRepository
      .createQueryBuilder('violation')
      .leftJoin('violation.requirement', 'requirement')
      .leftJoin('requirement.zone', 'zone')
      .select('zone.name', 'zone_name')
      .addSelect('COUNT(*)', 'violations_count')
      .groupBy('zone.name')
      .orderBy('violations_count', 'DESC')
      .limit(5)
      .getRawMany();

    // Маяки с низким зарядом
    const lowBatteryBeacons = await this.beaconRepository.find({
      where: { battery_level: 20 },
      select: { id: true, uuid: true, battery_level: true },
      order: { battery_level: 'ASC' },
      take: 5,
    });

    // Присутствие за неделю
    const weeklyAttendance = await this.getWeeklyAttendance();

    return {
      objects_count: objectsCount,
      beacons_count: beaconsCount,
      employees_count: employeesCount,
      sla_violations: slaViolations,
      top_sla_violations: topSlaViolations,
      low_battery_beacons: lowBatteryBeacons,
      weekly_attendance: weeklyAttendance,
    };
  }

  async getAttendanceAnalytics(from: Date, to: Date, userId?: string) {
    const queryBuilder = this.attendanceRepository.createQueryBuilder('attendance')
      .where('attendance.enter_time >= :from', { from })
      .andWhere('attendance.enter_time < :to', { to });

    if (userId) {
      queryBuilder.andWhere('attendance.user_id = :userId', { userId });
    }

    const records = await queryBuilder
      .leftJoinAndSelect('attendance.zone', 'zone')
      .getMany();

    // Группировка по датам
    const byDate = records.reduce((acc, record) => {
      const date = record.enter_time.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total_duration: 0,
          unique_users: new Set(),
        };
      }
      acc[date].total_duration += record.duration_minutes;
      acc[date].unique_users.add(record.user_id);
      return acc;
    }, {} as Record<string, any>);

    return {
      data: Object.values(byDate).map((day: any) => ({
        date: day.date,
        total_duration_minutes: day.total_duration,
        unique_users_count: day.unique_users.size,
      })),
    };
  }

  async getSlaAnalytics(from: Date, to: Date, contractId?: string) {
    const queryBuilder = this.violationRepository.createQueryBuilder('violation')
      .leftJoinAndSelect('violation.requirement', 'requirement')
      .leftJoinAndSelect('requirement.zone', 'zone')
      .where('violation.period_date >= :from', { from })
      .andWhere('violation.period_date <= :to', { to });

    if (contractId) {
      queryBuilder.andWhere('requirement.contract_id = :contractId', { contractId });
    }

    const violations = await queryBuilder.getMany();

    return {
      data: violations.map((v) => ({
        requirement_id: v.requirement_id,
        zone_name: v.requirement?.zone?.name,
        period_date: v.period_date,
        required_count: v.required_count,
        actual_count: v.actual_count,
        deficit: v.deficit,
        status: v.deficit > 0 ? 'violated' : 'fulfilled',
      })),
    };
  }

  private async getWeeklyAttendance() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const records = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('DATE(attendance.enter_time)', 'date')
      .addSelect('COUNT(DISTINCT attendance.user_id)', 'count')
      .where('attendance.enter_time >= :startDate', { startDate })
      .andWhere('attendance.enter_time < :endDate', { endDate })
      .groupBy('DATE(attendance.enter_time)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return records;
  }
}
