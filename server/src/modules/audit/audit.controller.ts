import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { GetAuditLogsDto } from './dto/audit.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin/audit')
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Получение логов аудита' })
  @ApiQuery({ name: 'user_id', required: false, description: 'ID пользователя' })
  @ApiQuery({ name: 'action', required: false, description: 'Тип действия' })
  @ApiQuery({ name: 'entity_type', required: false, description: 'Тип сущности' })
  @ApiQuery({ name: 'from', required: false, description: 'Начальная дата (ISO)' })
  @ApiQuery({ name: 'to', required: false, description: 'Конечная дата (ISO)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Лимит (по умолчанию 100)' })
  @ApiResponse({ status: 200, description: 'Список логов аудита' })
  async getLogs(@Query() filters: GetAuditLogsDto) {
    return this.auditService.getLogs({
      user_id: filters.user_id,
      action: filters.action,
      entity_type: filters.entity_type,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      limit: filters.limit,
    });
  }

  @Get('stats/actions')
  @ApiOperation({ summary: 'Статистика по типам действий' })
  @ApiResponse({ status: 200, description: 'Статистика' })
  async getStatsByAction() {
    return this.auditService.getStatsByAction();
  }

  @Get('stats/entities')
  @ApiOperation({ summary: 'Статистика по типам сущностей' })
  @ApiResponse({ status: 200, description: 'Статистика' })
  async getStatsByEntityType() {
    return this.auditService.getStatsByEntityType();
  }
}
