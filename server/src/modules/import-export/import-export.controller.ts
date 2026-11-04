import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportExportService } from './import-export.service';

@ApiTags('import-export')
@ApiBearerAuth()
@Controller('admin')
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Get('export/:type')
  @ApiOperation({ summary: 'Экспорт данных в Excel' })
  @ApiResponse({ status: 200, description: 'Файл экспортирован' })
  async exportData(
    @Param('type') type: string,
    @Res() response: Response,
  ) {
    switch (type) {
      case 'objects':
        return this.importExportService.exportObjects(response);
      default:
        throw new BadRequestException(`Экспорт для типа '${type}' не реализован`);
    }
  }

  @Post('import/:type')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Импорт данных из Excel' })
  @ApiQuery({ name: 'mode', enum: ['add', 'update', 'replace'], description: 'Режим импорта' })
  @ApiResponse({ status: 200, description: 'Данные импортированы' })
  @ApiResponse({ status: 400, description: 'Ошибки валидации' })
  async importData(
    @Param('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode: 'add' | 'update' | 'replace' = 'add',
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Размер файла превышает 10 МБ');
    }

    switch (type) {
      case 'objects':
        return this.importExportService.importObjects(file, mode);
      default:
        throw new BadRequestException(`Импорт для типа '${type}' не реализован`);
    }
  }

  @Get('templates/:type')
  @ApiOperation({ summary: 'Скачивание шаблона Excel' })
  @ApiResponse({ status: 200, description: 'Шаблон скачан' })
  async getTemplate(
    @Param('type') type: string,
    @Res() response: Response,
  ) {
    const workbook = await this.importExportService.getTemplate(type);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', `attachment; filename=template_${type}.xlsx`);

    await workbook.xlsx.write(response);
    response.end();
  }
}
