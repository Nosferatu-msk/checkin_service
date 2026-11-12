import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(createObjectDto: CreateObjectDto): Promise<Object> {
    const object = this.objectRepository.create(createObjectDto);
    return this.objectRepository.save(object);
  }

  async findAll(page = 1, perPage = 20, search?: string, isActive?: boolean) {
    const queryBuilder = this.objectRepository.createQueryBuilder('object');

    if (search) {
      queryBuilder.where('object.name ILIKE :search OR object.address ILIKE :search', {
        search: `%${search}%`,
      });
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

  async findOne(id: string): Promise<Object> {
    const object = await this.objectRepository.findOne({
      where: { id },
      relations: { zones: true },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    return object;
  }

  async update(id: string, updateObjectDto: UpdateObjectDto): Promise<Object> {
    const object = await this.objectRepository.findOne({ where: { id } });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    Object.assign(object, updateObjectDto);
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

  async findAllForExport(): Promise<ObjectEntity[]> {
    return await this.objectRepository.find({
      order: { created_at: 'DESC' },
    });
  }
}
