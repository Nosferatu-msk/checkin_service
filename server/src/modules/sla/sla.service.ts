import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZoneRequirement } from './entities/zone-requirement.entity';
import { RequirementViolation } from './entities/requirement-violation.entity';
import { CreateZoneRequirementDto, UpdateZoneRequirementDto } from './dto/sla.dto';

@Injectable()
export class SlaService {
  constructor(
    @InjectRepository(ZoneRequirement)
    private requirementRepository: Repository<ZoneRequirement>,
    @InjectRepository(RequirementViolation)
    private violationRepository: Repository<RequirementViolation>,
  ) {}

  async createRequirement(createDto: CreateZoneRequirementDto): Promise<ZoneRequirement> {
    const requirement = this.requirementRepository.create(createDto);
    return this.requirementRepository.save(requirement);
  }

  async findAllRequirements(zoneId?: string, contractId?: string, isActive?: boolean) {
    const queryBuilder = this.requirementRepository.createQueryBuilder('requirement')
      .leftJoinAndSelect('requirement.zone', 'zone')
      .leftJoinAndSelect('requirement.contract', 'contract');

    if (zoneId) {
      queryBuilder.andWhere('requirement.zone_id = :zoneId', { zoneId });
    }

    if (contractId) {
      queryBuilder.andWhere('requirement.contract_id = :contractId', { contractId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('requirement.is_active = :isActive', { isActive });
    }

    const requirements = await queryBuilder.getMany();
    return { data: requirements };
  }

  async updateRequirement(id: string, updateDto: UpdateZoneRequirementDto): Promise<ZoneRequirement> {
    const requirement = await this.requirementRepository.findOne({ where: { id } });

    if (!requirement) {
      throw new NotFoundException('Норматив не найден');
    }

    Object.assign(requirement, updateDto);
    return this.requirementRepository.save(requirement);
  }

  async removeRequirement(id: string): Promise<void> {
    const requirement = await this.requirementRepository.findOne({ where: { id } });

    if (!requirement) {
      throw new NotFoundException('Норматив не найден');
    }

    await this.requirementRepository.remove(requirement);
  }

  async getViolations(from?: Date, to?: Date, contractId?: string) {
    const queryBuilder = this.violationRepository.createQueryBuilder('violation')
      .leftJoinAndSelect('violation.requirement', 'requirement')
      .leftJoinAndSelect('requirement.zone', 'zone')
      .leftJoinAndSelect('requirement.contract', 'contract');

    if (from) {
      queryBuilder.andWhere('violation.period_date >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('violation.period_date <= :to', { to });
    }

    if (contractId) {
      queryBuilder.andWhere('requirement.contract_id = :contractId', { contractId });
    }

    const violations = await queryBuilder
      .orderBy('violation.period_date', 'DESC')
      .getMany();

    return { data: violations };
  }
}
