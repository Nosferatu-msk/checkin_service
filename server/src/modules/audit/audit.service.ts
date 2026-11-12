import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: CreateAuditLogDto): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create(params);
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Логируем ошибку, но не прерываем основной процесс
      this.logger.error(`Failed to save audit log: ${error.message}`, error.stack);
    }
  }

  async getLogs(filters: {
    user_id?: string;
    action?: string;
    entity_type?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.user_id) {
      query.andWhere('audit.user_id = :user_id', { user_id: filters.user_id });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.entity_type) {
      query.andWhere('audit.entity_type = :entity_type', {
        entity_type: filters.entity_type,
      });
    }

    if (filters.from) {
      query.andWhere('audit.created_at >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('audit.created_at <= :to', { to: filters.to });
    }

    query.orderBy('audit.created_at', 'DESC');
    query.limit(filters.limit || 100);

    const logs = await query.getMany();

    return {
      data: logs,
    };
  }

  async getStatsByAction() {
    const stats = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    return { data: stats };
  }

  async getStatsByEntityType() {
    const stats = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.entity_type', 'entity_type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.entity_type')
      .getRawMany();

    return { data: stats };
  }
}
