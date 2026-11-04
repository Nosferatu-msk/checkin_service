import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Проверка уникальности login
    const existingUser = await this.userRepository.findOne({
      where: { login: createUserDto.login },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    // Хэширование пароля
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.userRepository.create({
      ...createUserDto,
      password_hash: passwordHash,
    });

    return this.userRepository.save(user);
  }

  async findAll(page = 1, perPage = 20, search?: string, role?: string, isActive?: boolean) {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        'user.login ILIKE :search OR user.full_name ILIKE :search OR user.email ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.is_active = :isActive', { isActive });
    }

    const total = await queryBuilder.getCount();
    const users = await queryBuilder
      .skip((page - 1) * perPage)
      .take(perPage)
      .orderBy('user.created_at', 'DESC')
      .getMany();

    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    Object.assign(user, updateUserDto);
    const updated = await this.userRepository.save(user);

    return this.sanitizeUser(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.userRepository.remove(user);
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { login } });
  }

  private sanitizeUser(user: User): any {
    const { password_hash, device_fingerprint_hash, ...result } = user;
    return result;
  }
}
