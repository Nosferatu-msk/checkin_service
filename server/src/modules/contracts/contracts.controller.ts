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
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UpdateContractDto,
  AddObjectsDto,
  AddEmployeesDto,
  AddCuratorsDto,
} from './dto/contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('admin/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Создание договора' })
  @ApiResponse({ status: 201, description: 'Договор создан' })
  async create(@Body() createContractDto: CreateContractDto) {
    const contract = await this.contractsService.create(createContractDto);
    return { data: contract };
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка договоров' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, example: 20 })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'curator_id', required: false, description: 'Фильтр по куратору' })
  @ApiResponse({ status: 200, description: 'Список договоров' })
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 20,
    @Query('is_active') isActive?: boolean,
    @Query('curator_id') curatorId?: string,
  ) {
    return this.contractsService.findAll(Number(page), Number(perPage), isActive, curatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение договора по ID' })
  @ApiResponse({ status: 200, description: 'Договор найден' })
  @ApiResponse({ status: 404, description: 'Договор не найден' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const contract = await this.contractsService.findOne(id);
    return { data: contract };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновление договора' })
  @ApiResponse({ status: 200, description: 'Договор обновлен' })
  @ApiResponse({ status: 404, description: 'Договор не найден' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    const contract = await this.contractsService.update(id, updateContractDto);
    return { data: contract };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление договора' })
  @ApiResponse({ status: 204, description: 'Договор удален' })
  @ApiResponse({ status: 404, description: 'Договор не найден' })
  @ApiResponse({ status: 409, description: 'Договор имеет привязки' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.contractsService.remove(id);
  }

  @Post(':id/objects')
  @ApiOperation({ summary: 'Привязка объектов к договору' })
  @ApiResponse({ status: 200, description: 'Объекты привязаны' })
  @ApiResponse({ status: 404, description: 'Договор или объекты не найдены' })
  async addObjects(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addObjectsDto: AddObjectsDto,
  ) {
    const result = await this.contractsService.addObjects(id, addObjectsDto.object_ids);
    return { data: result };
  }

  @Post(':id/employees')
  @ApiOperation({ summary: 'Привязка сотрудников к договору' })
  @ApiResponse({ status: 200, description: 'Сотрудники привязаны' })
  @ApiResponse({ status: 404, description: 'Договор или сотрудники не найдены' })
  async addEmployees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addEmployeesDto: AddEmployeesDto,
  ) {
    const result = await this.contractsService.addEmployees(id, addEmployeesDto.employee_ids);
    return { data: result };
  }

  @Post(':id/curators')
  @ApiOperation({ summary: 'Привязка кураторов к договору' })
  @ApiResponse({ status: 200, description: 'Кураторы привязаны' })
  @ApiResponse({ status: 404, description: 'Договор или кураторы не найдены' })
  async addCurators(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addCuratorsDto: AddCuratorsDto,
  ) {
    const result = await this.contractsService.addCurators(id, addCuratorsDto.curator_ids);
    return { data: result };
  }
}
