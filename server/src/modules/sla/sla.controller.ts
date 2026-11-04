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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { CreateZoneRequirementDto, UpdateZoneRequirementDto } from './dto/sla.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('sla')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin/sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Post('requirements')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Создание норматива' })
  @ApiResponse({ status: 201, description: 'Норматив создан' })
  async createRequirement(@Body() createDto: CreateZoneRequirementDto) {
    const requirement = await this.slaService.createRequirement(createDto);
    return { data: requirement };
  }

  @Get('requirements')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Получение списка нормативов' })
  @ApiQuery({ name: 'zone_id', required: false })
  @ApiQuery({ name: 'contract_id', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Список нормативов' })
  async findAllRequirements(
    @Query('zone_id') zoneId?: string,
    @Query('contract_id') contractId?: string,
    @Query('is_active') isActive?: boolean,
  ) {
    return this.slaService.findAllRequirements(zoneId, contractId, isActive);
  }

  @Put('requirements/:id')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Обновление норматива' })
  @ApiResponse({ status: 200, description: 'Норматив обновлен' })
  @ApiResponse({ status: 404, description: 'Норматив не найден' })
  async updateRequirement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateZoneRequirementDto,
  ) {
    const requirement = await this.slaService.updateRequirement(id, updateDto);
    return { data: requirement };
  }

  @Delete('requirements/:id')
  @Roles('admin', 'curator')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление норматива' })
  @ApiResponse({ status: 204, description: 'Норматив удален' })
  @ApiResponse({ status: 404, description: 'Норматив не найден' })
  async removeRequirement(@Param('id', ParseUUIDPipe) id: string) {
    await this.slaService.removeRequirement(id);
  }

  @Get('violations')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Получение нарушений SLA' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'contract_id', required: false })
  @ApiResponse({ status: 200, description: 'Список нарушений' })
  async getViolations(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('contract_id') contractId?: string,
  ) {
    return this.slaService.getViolations(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      contractId,
    );
  }
}
