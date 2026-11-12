import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Создание пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return { data: user };
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка пользователей' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'curator', 'employee'] })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
    @Query('search') search?: string,
    @Query('role') role?: 'admin' | 'curator' | 'employee',
    @Query('is_active') isActive?: boolean,
  ) {
    return this.usersService.findAll(Number(page), Number(perPage), search, role, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Пользователь найден' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    return { data: user };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновление пользователя' })
  @ApiResponse({ status: 200, description: 'Пользователь обновлен' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, updateUserDto);
    return { data: user };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление пользователя' })
  @ApiResponse({ status: 204, description: 'Пользователь удален' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  // === User Devices Endpoints ===

  @Post(':id/devices')
  @ApiOperation({ summary: 'Добавление устройства пользователя' })
  @ApiResponse({ status: 201, description: 'Устройство добавлено' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async addDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createDeviceDto: CreateDeviceDto,
  ) {
    const device = await this.usersService.addDevice(id, createDeviceDto);
    return { data: device };
  }

  @Get(':id/devices')
  @ApiOperation({ summary: 'Получение списка устройств пользователя' })
  @ApiResponse({ status: 200, description: 'Список устройств' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async getDevices(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getDevices(id);
  }

  @Get(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Получение устройства пользователя' })
  @ApiResponse({ status: 200, description: 'Устройство найдено' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  async getDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    const device = await this.usersService.getDevice(id, deviceId);
    return { data: device };
  }

  @Put(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Обновление устройства пользователя' })
  @ApiResponse({ status: 200, description: 'Устройство обновлено' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  async updateDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    const device = await this.usersService.updateDevice(id, deviceId, updateDeviceDto);
    return { data: device };
  }

  @Delete(':id/devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление устройства пользователя' })
  @ApiResponse({ status: 204, description: 'Устройство удалено' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  async removeDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    await this.usersService.removeDevice(id, deviceId);
  }
}
