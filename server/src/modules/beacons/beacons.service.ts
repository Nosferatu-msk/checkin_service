import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beacon } from './entities/beacon.entity';
import { CreateBeaconDto, UpdateBeaconDto } from './dto/beacon.dto';

@Injectable()
export class BeaconsService {
  constructor(
    @InjectRepository(Beacon)
    private beaconRepository: Repository<Beacon>,
  ) {}

  async create(createBeaconDto: CreateBeaconDto): Promise<Beacon> {
    // Проверка уникальности UUID
    const existingBeacon = await this.beaconRepository.findOne({
      where: { uuid: createBeaconDto.uuid },
    });

    if (existingBeacon) {
      throw new ConflictException('Маяк с таким UUID уже существует');
    }

    const beacon = this.beaconRepository.create(createBeaconDto);
    return this.beaconRepository.save(beacon);
  }

  async findAll(
    page = 1,
    perPage = 20,
    zoneId?: string,
    isActive?: boolean,
    batteryLow?: boolean,
  ) {
    const queryBuilder = this.beaconRepository.createQueryBuilder('beacon');

    if (zoneId) {
      queryBuilder.where('beacon.zone_id = :zoneId', { zoneId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('beacon.is_active = :isActive', { isActive });
    }

    if (batteryLow) {
      queryBuilder.andWhere('beacon.battery_level < 20');
    }

    const total = await queryBuilder.getCount();
    const beacons = await queryBuilder
      .leftJoinAndSelect('beacon.zone', 'zone')
      .skip((page - 1) * perPage)
      .take(perPage)
      .orderBy('beacon.created_at', 'DESC')
      .getMany();

    return {
      data: beacons,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string): Promise<Beacon> {
    const beacon = await this.beaconRepository.findOne({
      where: { id },
      relations: { zone: true },
    });

    if (!beacon) {
      throw new NotFoundException('Маяк не найден');
    }

    return beacon;
  }

  async findByUuid(uuid: string): Promise<Beacon> {
    const beacon = await this.beaconRepository.findOne({
      where: { uuid },
      relations: { zone: true },
    });

    if (!beacon) {
      throw new NotFoundException('Маяк не найден');
    }

    return beacon;
  }

  async update(id: string, updateBeaconDto: UpdateBeaconDto): Promise<Beacon> {
    const beacon = await this.beaconRepository.findOne({ where: { id } });

    if (!beacon) {
      throw new NotFoundException('Маяк не найден');
    }

    Object.assign(beacon, updateBeaconDto);
    return this.beaconRepository.save(beacon);
  }

  async remove(id: string): Promise<void> {
    const beacon = await this.beaconRepository.findOne({ where: { id } });

    if (!beacon) {
      throw new NotFoundException('Маяк не найден');
    }

    await this.beaconRepository.remove(beacon);
  }

  async deactivate(id: string): Promise<Beacon> {
    const beacon = await this.beaconRepository.findOne({ where: { id } });

    if (!beacon) {
      throw new NotFoundException('Маяк не найден');
    }

    beacon.is_active = false;
    return this.beaconRepository.save(beacon);
  }
}
