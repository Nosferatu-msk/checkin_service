import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudLog } from './entities/fraud-log.entity';
import { CreateFraudLogDto, ReviewFraudDto } from './dto/fraud.dto';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    @InjectRepository(FraudLog)
    private fraudLogRepository: Repository<FraudLog>,
  ) {}

  async create(createDto: CreateFraudLogDto): Promise<FraudLog> {
    const fraudLog = this.fraudLogRepository.create(createDto);
    const saved = await this.fraudLogRepository.save(fraudLog);
    
    this.logger.warn(`Fraud detected: ${createDto.fraud_type} for user ${createDto.user_id || 'unknown'}`);
    
    // Если критический фрод, можно отправить уведомление администратору
    if (createDto.severity === 'critical') {
      // TODO: Отправить уведомление администраторам
    }
    
    return saved;
  }

  async findAll(
    userId?: string,
    fraudType?: string,
    severity?: string,
    isReviewed?: boolean,
    from?: Date,
    to?: Date,
  ) {
    const queryBuilder = this.fraudLogRepository.createQueryBuilder('fraud')
      .leftJoinAndSelect('fraud.user', 'user')
      .leftJoinAndSelect('fraud.reviewer', 'reviewer');

    if (userId) {
      queryBuilder.andWhere('fraud.user_id = :userId', { userId });
    }

    if (fraudType) {
      queryBuilder.andWhere('fraud.fraud_type = :fraudType', { fraudType });
    }

    if (severity) {
      queryBuilder.andWhere('fraud.severity = :severity', { severity });
    }

    if (isReviewed !== undefined) {
      queryBuilder.andWhere('fraud.is_reviewed = :isReviewed', { isReviewed });
    }

    if (from) {
      queryBuilder.andWhere('fraud.created_at >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('fraud.created_at <= :to', { to });
    }

    const fraudLogs = await queryBuilder
      .orderBy('fraud.created_at', 'DESC')
      .getMany();

    return { data: fraudLogs };
  }

  async review(id: number, reviewDto: ReviewFraudDto, reviewerId: string): Promise<FraudLog> {
    const fraudLog = await this.fraudLogRepository.findOne({ where: { id } });

    if (!fraudLog) {
      throw new NotFoundException('Инцидент не найден');
    }

    fraudLog.is_reviewed = reviewDto.is_reviewed;
    fraudLog.reviewed_by = reviewerId;
    fraudLog.reviewed_at = new Date();

    if (reviewDto.notes) {
      fraudLog.details = { ...fraudLog.details, review_notes: reviewDto.notes };
    }

    return this.fraudLogRepository.save(fraudLog);
  }

  async getUnreviewedCount(): Promise<number> {
    return this.fraudLogRepository.count({
      where: { is_reviewed: false },
    });
  }

  async getStatsByType() {
    const stats = await this.fraudLogRepository
      .createQueryBuilder('fraud')
      .select('fraud.fraud_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('fraud.fraud_type')
      .getRawMany();

    return { data: stats };
  }
}
