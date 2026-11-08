import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
  ) {}

  async create(createZoneDto: CreateZoneDto): Promise<Zone> {
    // Определение level
    let level = 1;
    let parentPath = '';

    if (createZoneDto.parent_zone_id) {
      const parentZone = await this.zoneRepository.findOne({
        where: { id: createZoneDto.parent_zone_id },
      });

      if (!parentZone) {
        throw new NotFoundException('Родительская зона не найдена');
      }

      level = parentZone.level + 1;
      parentPath = parentZone.path;
    }

    // Создаем зону с временным path (будет обновлен после сохранения)
    const zone = this.zoneRepository.create({
      ...createZoneDto,
      level,
      path: 'temp', // Временное значение, ltree позволяет
    });

    const savedZone = await this.zoneRepository.save(zone);

    // Обновить path с реальным ID
    savedZone.path = parentPath
      ? `${parentPath}.${savedZone.id}`
      : savedZone.id;

    return this.zoneRepository.save(savedZone);
  }

  async findAll(objectId?: string, zoneType?: string) {
    const queryBuilder = this.zoneRepository.createQueryBuilder('zone');

    if (objectId) {
      queryBuilder.where('zone.object_id = :objectId', { objectId });
    }

    if (zoneType) {
      queryBuilder.andWhere('zone.zone_type = :zoneType', { zoneType });
    }

    const zones = await queryBuilder
      .leftJoinAndSelect('zone.object', 'object')
      .leftJoinAndSelect('zone.parent_zone', 'parent_zone')
      .orderBy('zone.path', 'ASC')
      .getMany();

    return { data: zones };
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({
      where: { id },
      relations: { object: true, parent_zone: true, children: true, beacons: true },
    });

    if (!zone) {
      throw new NotFoundException('Зона не найдена');
    }

    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({ where: { id } });

    if (!zone) {
      throw new NotFoundException('Зона не найдена');
    }

    // Если изменился parent_zone_id, нужно пересчитать path и level
    if (updateZoneDto.parent_zone_id && updateZoneDto.parent_zone_id !== zone.parent_zone_id) {
      const parentZone = await this.zoneRepository.findOne({
        where: { id: updateZoneDto.parent_zone_id },
      });

      if (!parentZone) {
        throw new NotFoundException('Родительская зона не найдена');
      }

      zone.level = parentZone.level + 1;
      zone.path = `${parentZone.path}.${zone.id}`;

      // TODO: Обновить path для всех дочерних зон (каскадно)
    }

    Object.assign(zone, updateZoneDto);
    return this.zoneRepository.save(zone);
  }

  async remove(id: string): Promise<void> {
    const zone = await this.zoneRepository.findOne({
      where: { id },
      relations: { children: true },
    });

    if (!zone) {
      throw new NotFoundException('Зона не найдена');
    }

    if (zone.children && zone.children.length > 0) {
      throw new ConflictException('Невозможно удалить зону с дочерними элементами');
    }

    await this.zoneRepository.remove(zone);
  }

  async getTree(objectId: string) {
    const zones = await this.zoneRepository.find({
      where: { object_id: objectId },
      relations: { children: true },
      order: { path: 'ASC' },
    });

    // Построение дерева
    const tree = this.buildTree(zones);
    return { data: tree };
  }

  private buildTree(zones: Zone[], parentId: string | null = null): any[] {
    return zones
      .filter((zone) => zone.parent_zone_id === parentId)
      .map((zone) => ({
        ...zone,
        children: this.buildTree(zones, zone.id),
      }));
  }
}
