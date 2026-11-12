import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { ObjectsService } from '../objects/objects.service';

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(private readonly objectsService: ObjectsService) {}

  async exportObjects(response: Response) {
    const objects = await this.objectsService.findAllForExport();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Объекты');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Название', key: 'name', width: 30 },
      { header: 'Адрес', key: 'address', width: 50 },
      { header: 'Активен', key: 'is_active', width: 10 },
      { header: 'Создан', key: 'created_at', width: 20 },
    ];

    // Добавляем стили для заголовка
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Добавляем данные
    objects.forEach((obj) => {
      worksheet.addRow({
        id: obj.id,
        name: obj.name,
        address: obj.address || '',
        is_active: obj.is_active ? 'Да' : 'Нет',
        created_at: obj.created_at.toISOString(),
      });
    });

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=objects-${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(response);
    response.end();

    this.logger.log(`Exported ${objects.length} objects`);
  }

  async importObjects(
    file: any,
    mode: 'add' | 'update' | 'replace' = 'add',
  ): Promise<{ imported: number; updated: number; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(file.buffer);
    } catch (error) {
      throw new BadRequestException('Неверный формат Excel файла');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Файл не содержит данных');
    }

    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    // Режим replace - удаляем все существующие объекты
    if (mode === 'replace') {
      const existing = await this.objectsService.findAllForExport();
      for (const obj of existing) {
        await this.objectsService.remove(obj.id);
      }
      this.logger.log(`Replace mode: removed ${existing.length} existing objects`);
    }

    // Обрабатываем строки
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const name = row.getCell(1).value?.toString()?.trim();
      const address = row.getCell(2).value?.toString()?.trim() || '';
      const isActiveValue = row.getCell(3).value;
      const isActive =
        isActiveValue === 'Да' ||
        isActiveValue === 'true' ||
        isActiveValue === true ||
        isActiveValue === 1;

      // Валидация
      if (!name) {
        errors.push(`Строка ${i}: Название обязательно`);
        continue;
      }

      if (name.length > 255) {
        errors.push(`Строка ${i}: Название слишком длинное (макс. 255 символов)`);
        continue;
      }

      try {
        if (mode === 'add' || mode === 'replace') {
          // Проверяем дубликаты по названию
          const existing = await this.objectsService.findByName(name);
          if (existing) {
            errors.push(`Строка ${i}: Объект с названием "${name}" уже существует`);
            continue;
          }

          await this.objectsService.create({
            name,
            address: address || null,
            is_active: isActive,
          });
          imported++;
        } else if (mode === 'update') {
          // Ищем по названию и обновляем
          const existing = await this.objectsService.findByName(name);
          if (existing) {
            await this.objectsService.update(existing.id, {
              name,
              address: address || null,
              is_active: isActive,
            });
            updated++;
          } else {
            // Создаем новый, если не найден
            await this.objectsService.create({
              name,
              address: address || null,
              is_active: isActive,
            });
            imported++;
          }
        }
      } catch (error) {
        errors.push(`Строка ${i}: ${error.message}`);
      }
    }

    this.logger.log(
      `Imported: ${imported}, Updated: ${updated}, Errors: ${errors.length} in ${mode} mode`,
    );

    return { imported, updated, errors };
  }

  async getTemplate(type: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Шаблон');

    switch (type) {
      case 'objects':
        worksheet.columns = [
          { header: 'Название', key: 'name', width: 30 },
          { header: 'Адрес', key: 'address', width: 50 },
          { header: 'Активен (Да/Нет)', key: 'is_active', width: 15 },
        ];

        // Добавляем стили для заголовка
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        // Добавляем пример
        worksheet.addRow({
          name: 'Пример объекта',
          address: 'г. Москва, ул. Примерная, д. 1',
          is_active: 'Да',
        });
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
