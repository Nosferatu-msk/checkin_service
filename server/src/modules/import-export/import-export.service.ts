import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  async exportObjects(response: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Объекты');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Название', key: 'name', width: 30 },
      { header: 'Адрес', key: 'address', width: 50 },
      { header: 'Активен', key: 'is_active', width: 10 },
      { header: 'Создан', key: 'created_at', width: 20 },
    ];

    // TODO: Получить данные из БД
    // const objects = await this.objectsService.findAll();
    // worksheet.addRows(objects);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', 'attachment; filename=objects.xlsx');

    await workbook.xlsx.write(response);
    response.end();
  }

  async importObjects(file: Express.Multer.File, mode: 'add' | 'update' | 'replace') {
    const workbook = new ExcelJS.Workbook();
    
    try {
      await workbook.xlsx.load(file.buffer);
    } catch (error) {
      throw new BadRequestException('Неверный формат Excel файла');
    }

    const worksheet = workbook.worksheets[0];
    const rows: any[] = [];
    const errors: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Пропускаем заголовок

      const data = {
        name: row.getCell(1).value,
        address: row.getCell(2).value,
        is_active: row.getCell(3).value === 'true' || row.getCell(3).value === true,
      };

      if (!data.name) {
        errors.push({ row: rowNumber, field: 'name', message: 'Название обязательно' });
        return;
      }

      rows.push(data);
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Ошибки валидации',
        errors,
      });
    }

    this.logger.log(`Imported ${rows.length} objects in ${mode} mode`);

    // TODO: Сохранить в БД в зависимости от mode
    return {
      imported: rows.length,
      errors: [],
    };
  }

  async getTemplate(type: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Шаблон');

    switch (type) {
      case 'objects':
        worksheet.columns = [
          { header: 'Название', key: 'name', width: 30 },
          { header: 'Адрес', key: 'address', width: 50 },
          { header: 'Активен (true/false)', key: 'is_active', width: 15 },
        ];
        break;

      case 'zones':
        worksheet.columns = [
          { header: 'Название', key: 'name', width: 30 },
          { header: 'ID объекта', key: 'object_id', width: 40 },
          { header: 'Тип (floor/room/zone)', key: 'zone_type', width: 20 },
          { header: 'ID родительской зоны', key: 'parent_zone_id', width: 40 },
        ];
        break;

      case 'beacons':
        worksheet.columns = [
          { header: 'UUID', key: 'uuid', width: 40 },
          { header: 'Major', key: 'major', width: 10 },
          { header: 'Minor', key: 'minor', width: 10 },
          { header: 'MAC адрес', key: 'mac_address', width: 20 },
          { header: 'ID зоны', key: 'zone_id', width: 40 },
        ];
        break;

      case 'employees':
        worksheet.columns = [
          { header: 'Логин', key: 'login', width: 20 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'ФИО', key: 'full_name', width: 40 },
          { header: 'Телефон', key: 'phone', width: 20 },
          { header: 'Роль (admin/curator/employee)', key: 'role', width: 25 },
        ];
        break;

      default:
        throw new BadRequestException(`Неизвестный тип шаблона: ${type}`);
    }

    return workbook;
  }
}
