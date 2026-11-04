import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { CreateContractDto, UpdateContractDto } from './dto/contract.dto';
import { Object } from '../objects/entities/object.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Object)
    private objectRepository: Repository<Object>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createContractDto: CreateContractDto): Promise<Contract> {
    const contract = this.contractRepository.create(createContractDto);
    return this.contractRepository.save(contract);
  }

  async findAll(page = 1, perPage = 20, isActive?: boolean, curatorId?: string) {
    const queryBuilder = this.contractRepository.createQueryBuilder('contract');

    if (isActive !== undefined) {
      queryBuilder.where('contract.is_active = :isActive', { isActive });
    }

    // Если указан curatorId, фильтруем только договоры этого куратора
    if (curatorId) {
      queryBuilder
        .innerJoin('contract.curators', 'curator', 'curator.id = :curatorId', { curatorId })
        .leftJoinAndSelect('contract.curators', 'curators');
    } else {
      queryBuilder.leftJoinAndSelect('contract.curators', 'curators');
    }

    queryBuilder
      .leftJoinAndSelect('contract.objects', 'objects')
      .leftJoinAndSelect('contract.employees', 'employees');

    const total = await queryBuilder.getCount();
    const contracts = await queryBuilder
      .skip((page - 1) * perPage)
      .take(perPage)
      .orderBy('contract.created_at', 'DESC')
      .getMany();

    return {
      data: contracts.map((contract) => ({
        ...contract,
        objects_count: contract.objects?.length || 0,
        employees_count: contract.employees?.length || 0,
        curators_count: contract.curators?.length || 0,
        objects: undefined,
        employees: undefined,
      })),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['objects', 'employees', 'curators'],
    });

    if (!contract) {
      throw new NotFoundException('Договор не найден');
    }

    return contract;
  }

  async update(id: string, updateContractDto: UpdateContractDto): Promise<Contract> {
    const contract = await this.contractRepository.findOne({ where: { id } });

    if (!contract) {
      throw new NotFoundException('Договор не найден');
    }

    Object.assign(contract, updateContractDto);
    return this.contractRepository.save(contract);
  }

  async remove(id: string): Promise<void> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['objects', 'employees', 'curators'],
    });

    if (!contract) {
      throw new NotFoundException('Договор не найден');
    }

    // Проверка наличия привязок
    if (
      (contract.objects && contract.objects.length > 0) ||
      (contract.employees && contract.employees.length > 0)
    ) {
      throw new ConflictException('Невозможно удалить договор с привязанными объектами или сотрудниками');
    }

    await this.contractRepository.remove(contract);
  }

  async addObjects(contractId: string, objectIds: string[]): Promise<{ added: number; total: number }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['objects'],
    });

    if (!contract) {
      throw new NotFoundException('Договор не найден');
    }

    const objects = await this.objectRepository.findBy({ id: In(objectIds) });

    if (objects.length !== objectIds.length) {
      throw new NotFoundException('Некоторые объекты не найдены');
    }

    // Добавляем только новые объекты
    const existingIds = new Set(contract.objects?.map((o) => o.id) || []);
    const newObjects = objects.filter((o) => !existingIds.has(o.id));

    contract.objects = [...(contract.objects || []), ...newObjects];
    await this.contractRepository.save(contract);

    return {
      added: newObjects.length,
      total: contract.objects.length,
    };
  }

  async addEmployees(contractId: string, employeeIds: string[]): Promise<{ added: number; total: number }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['employees'],
    });

    if (!contract) {
      throw new NotFoundException('Договор не найден');
    }

    const employees = await this.userRepository.findBy({ id: In(employeeIds) });

    if (employees.length !== employeeIds.length) {
      throw new NotFoundException('Некоторые сотрудники не найдены');
    }

    const existingIds = new Set(contract.employees?.map((e) => e.id) || []);
    const newEmployees = employees.filter((e) => !existingIds.has(e.id));

    contract.employees = [...(contract.employees || []), ...newEmployees];
    await this.contractRepository.save(contract);

    return {
      added: newEmployees.length,
      total: contract.employees.length,
    };
  }

  async addCurators(contractId: string, curatorIds: string[]): Promise<{ added: number; total: number }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['curators'],
    });

    if (!contract) {
      throw new NotFoundException('Договор не найден');
    }

    const curators = await this.userRepository.findBy({ id: In(curatorIds) });

    if (curators.length !== curatorIds.length) {
      throw new NotFoundException('Некоторые кураторы не найдены');
    }

    const existingIds = new Set(contract.curators?.map((c) => c.id) || []);
    const newCurators = curators.filter((c) => !existingIds.has(c.id));

    contract.curators = [...(contract.curators || []), ...newCurators];
    await this.contractRepository.save(contract);

    return {
      added: newCurators.length,
      total: contract.curators.length,
    };
  }

  async isCuratorAssigned(contractId: string, userId: string): Promise<boolean> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['curators'],
    });

    if (!contract) {
      return false;
    }

    return contract.curators?.some((c) => c.id === userId) || false;
  }
}
