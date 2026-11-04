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
import { ObjectsService } from './objects.service';
import { CreateObjectDto, UpdateObjectDto } from './dto/object.dto';

@ApiTags('objects')
@ApiBearerAuth()
@Controller('admin/objects')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Создание объекта' })
  @ApiResponse({ status: 201, description: 'Объект создан' })
  async create(@Body() createObjectDto: CreateObjectDto) {
    const object = await this.objectsService.create(createObjectDto);
    return { data: object };
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка объектов' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Список объектов' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
    @Query('search') search?: string,
    @Query('is_active') isActive?: boolean,
  ) {
    return this.objectsService.findAll(Number(page), Number(perPage), search, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение объекта по ID' })
  @ApiResponse({ status: 200, description: 'Объект найден' })
  @ApiResponse({ status: 404, description: 'Объект не найден' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const object = await this.objectsService.findOne(id);
    return { data: object };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновление объекта' })
  @ApiResponse({ status: 200, description: 'Объект обновлен' })
  @ApiResponse({ status: 404, description: 'Объект не найден' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateObjectDto: UpdateObjectDto,
  ) {
    const object = await this.objectsService.update(id, updateObjectDto);
    return { data: object };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление объекта' })
  @ApiResponse({ status: 204, description: 'Объект удален' })
  @ApiResponse({ status: 404, description: 'Объект не найден' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.objectsService.remove(id);
  }
}
