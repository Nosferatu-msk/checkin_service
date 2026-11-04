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
import { BeaconsService } from './beacons.service';
import { CreateBeaconDto, UpdateBeaconDto } from './dto/beacon.dto';

@ApiTags('beacons')
@ApiBearerAuth()
@Controller('admin/beacons')
export class BeaconsController {
  constructor(private readonly beaconsService: BeaconsService) {}

  @Post()
  @ApiOperation({ summary: 'Создание маяка' })
  @ApiResponse({ status: 201, description: 'Маяк создан' })
  @ApiResponse({ status: 409, description: 'Маяк с таким UUID уже существует' })
  async create(@Body() createBeaconDto: CreateBeaconDto) {
    const beacon = await this.beaconsService.create(createBeaconDto);
    return { data: beacon };
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка маяков' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, example: 20 })
  @ApiQuery({ name: 'zone_id', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'battery_low', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Список маяков' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
    @Query('zone_id') zoneId?: string,
    @Query('is_active') isActive?: boolean,
    @Query('battery_low') batteryLow?: boolean,
  ) {
    return this.beaconsService.findAll(Number(page), Number(perPage), zoneId, isActive, batteryLow);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение маяка по ID' })
  @ApiResponse({ status: 200, description: 'Маяк найден' })
  @ApiResponse({ status: 404, description: 'Маяк не найден' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const beacon = await this.beaconsService.findOne(id);
    return { data: beacon };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновление маяка' })
  @ApiResponse({ status: 200, description: 'Маяк обновлен' })
  @ApiResponse({ status: 404, description: 'Маяк не найден' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBeaconDto: UpdateBeaconDto,
  ) {
    const beacon = await this.beaconsService.update(id, updateBeaconDto);
    return { data: beacon };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление маяка' })
  @ApiResponse({ status: 204, description: 'Маяк удален' })
  @ApiResponse({ status: 404, description: 'Маяк не найден' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.beaconsService.remove(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Деактивация маяка' })
  @ApiResponse({ status: 200, description: 'Маяк деактивирован' })
  @ApiResponse({ status: 404, description: 'Маяк не найден' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const beacon = await this.beaconsService.deactivate(id);
    return { data: beacon };
  }
}
