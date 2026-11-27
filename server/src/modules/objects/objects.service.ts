import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectEntity } from './entities/object.entity';
import { CreateObjectDto, UpdateObjectDto } from './dto/object.dto';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectRepository(ObjectEntity)
    private objectRepository: Repository<ObjectEntity>,
  ) {}

  private buildFullAddress(data: Partial<ObjectEntity>): string {
    const parts: string[] = [];
    if (data.country) parts.push(data.country);
    if (data.region) parts.push(data.region);
    if (data.city) parts.push(data.city);
    if (data.street) parts.push(data.street);
    if (data.building) parts.push(`д. ${data.building}`);
    if (data.structure) parts.push(`стр. ${data.structure}`);
    return parts.join(', ');
  }

  async create(createObjectDto: CreateObjectDto): Promise<ObjectEntity> {
    const existingObject = await this.objectRepository.findOne({
      where: { object_code: createObjectDto.object_code },
    });
    if (existingObject) {
      throw new ConflictException('Объект с таким кодом уже существует');
    }

    const fullAddress = this.buildFullAddress({
      country: createObjectDto.country || 'Россия',
      region: createObjectDto.region,
      city: createObjectDto.city,
      street: createObjectDto.street,
      building: createObjectDto.building,
      structure: createObjectDto.structure,
    });

    const object = this.objectRepository.create({
      ...createObjectDto,
      country: createObjectDto.country || 'Россия',
      full_address: fullAddress,
    });
    return this.objectRepository.save(object);
  }

  async findAll(page = 1, perPage = 20, search?: string, isActive?: boolean) {
    const queryBuilder = this.objectRepository.createQueryBuilder('object');

    if (search) {
      queryBuilder.where(
        'object.name ILIKE :search OR object.full_address ILIKE :search OR object.object_code ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('object.is_active = :isActive', { isActive });
    }

    const total = await queryBuilder.getCount();
    const objects = await queryBuilder
      .leftJoinAndSelect('object.zones', 'zone')
      .skip((page - 1) * perPage)
      .take(perPage)
      .orderBy('object.created_at', 'DESC')
      .getMany();

    return {
      data: objects.map((obj) => ({
        ...obj,
        full_address: obj.buildFullAddress(),
        zones_count: obj.zones?.length || 0,
        zones: undefined,
      })),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string): Promise<ObjectEntity> {
    const object = await this.objectRepository.findOne({
      where: { id },
      relations: { zones: true },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    (object as any).full_address = object.buildFullAddress();
    return object;
  }

  async update(id: string, updateObjectDto: UpdateObjectDto): Promise<ObjectEntity> {
    const object = await this.objectRepository.findOne({ where: { id } });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    if (updateObjectDto.object_code && updateObjectDto.object_code !== object.object_code) {
      const existingObject = await this.objectRepository.findOne({
        where: { object_code: updateObjectDto.object_code },
      });
      if (existingObject) {
        throw new ConflictException('Объект с таким кодом уже существует');
      }
    }

    const updatedData = { ...object, ...updateObjectDto };
    const fullAddress = this.buildFullAddress(updatedData);

    Object.assign(object, updateObjectDto, { full_address: fullAddress });
    return this.objectRepository.save(object);
  }

  async remove(id: string): Promise<void> {
    const object = await this.objectRepository.findOne({ where: { id } });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    await this.objectRepository.remove(object);
  }

  async findByName(name: string): Promise<ObjectEntity | null> {
    return await this.objectRepository.findOne({ where: { name } });
  }

  async findByCode(objectCode: string): Promise<ObjectEntity | null> {
    return await this.objectRepository.findOne({ where: { object_code: objectCode } });
  }

  async findAllForExport(): Promise<ObjectEntity[]> {
    return await this.objectRepository.find({
      order: { created_at: 'DESC' },
    });
  }
}
