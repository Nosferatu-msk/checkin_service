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
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@ApiTags('zones')
@ApiBearerAuth()
@Controller('admin/zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @ApiOperation({ summary: 'Создание зоны' })
  @ApiResponse({ status: 201, description: 'Зона создана' })
  @ApiResponse({ status: 404, description: 'Объект или родительская зона не найдены' })
  async create(@Body() createZoneDto: CreateZoneDto) {
    const zone = await this.zonesService.create(createZoneDto);
    return { data: zone };
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка зон' })
  @ApiQuery({ name: 'object_id', required: false })
  @ApiQuery({ name: 'zone_type', required: false, enum: ['floor', 'room', 'zone'] })
  @ApiResponse({ status: 200, description: 'Список зон' })
  async findAll(
    @Query('object_id') objectId?: string,
    @Query('zone_type') zoneType?: 'floor' | 'room' | 'zone',
  ) {
    return this.zonesService.findAll(objectId, zoneType);
  }

  @Get('tree/:objectId')
  @ApiOperation({ summary: 'Получение иерархии зон объекта' })
  @ApiResponse({ status: 200, description: 'Дерево зон' })
  async getTree(@Param('objectId', ParseUUIDPipe) objectId: string) {
    return this.zonesService.getTree(objectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение зоны по ID' })
  @ApiResponse({ status: 200, description: 'Зона найдена' })
  @ApiResponse({ status: 404, description: 'Зона не найдена' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.findOne(id);
    return { data: zone };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновление зоны' })
  @ApiResponse({ status: 200, description: 'Зона обновлена' })
  @ApiResponse({ status: 404, description: 'Зона не найдена' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    const zone = await this.zonesService.update(id, updateZoneDto);
    return { data: zone };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление зоны' })
  @ApiResponse({ status: 204, description: 'Зона удалена' })
  @ApiResponse({ status: 404, description: 'Зона не найдена' })
  @ApiResponse({ status: 409, description: 'Зона имеет дочерние элементы' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.zonesService.remove(id);
  }
}
