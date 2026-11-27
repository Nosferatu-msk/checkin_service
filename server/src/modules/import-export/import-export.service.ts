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
      { header: 'Код объекта', key: 'object_code', width: 15 },
      { header: 'Название', key: 'name', width: 30 },
      { header: 'Страна', key: 'country', width: 15 },
      { header: 'Регион', key: 'region', width: 20 },
      { header: 'Населённый пункт', key: 'city', width: 20 },
      { header: 'Улица', key: 'street', width: 20 },
      { header: 'Дом', key: 'building', width: 10 },
      { header: 'Строение/корпус', key: 'structure', width: 15 },
      { header: 'Полный адрес', key: 'full_address', width: 50 },
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
        object_code: obj.object_code,
        name: obj.name,
        country: obj.country || 'Россия',
        region: obj.region || '',
        city: obj.city || '',
        street: obj.street || '',
        building: obj.building || '',
        structure: obj.structure || '',
        full_address: obj.buildFullAddress(),
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
      const objectCode = row.getCell(1).value?.toString()?.trim();
      const name = row.getCell(2).value?.toString()?.trim();
      const country = row.getCell(3).value?.toString()?.trim() || 'Россия';
      const region = row.getCell(4).value?.toString()?.trim() || '';
      const city = row.getCell(5).value?.toString()?.trim() || '';
      const street = row.getCell(6).value?.toString()?.trim() || '';
      const building = row.getCell(7).value?.toString()?.trim() || '';
      const structure = row.getCell(8).value?.toString()?.trim() || '';
      const isActiveValue = row.getCell(9).value;
      const isActive =
        isActiveValue === 'Да' ||
        isActiveValue === 'true' ||
        isActiveValue === true ||
        isActiveValue === 1;

      // Валидация
      if (!objectCode) {
        errors.push(`Строка ${i}: Код объекта обязателен`);
        continue;
      }

      if (!/^[A-Z]{2}\/\d+\/\d+$/.test(objectCode)) {
        errors.push(`Строка ${i}: Код объекта должен быть в формате XX/NN/NN (например, RU/77/1)`);
        continue;
      }

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
          // Проверяем дубликаты по коду
          const existing = await this.objectsService.findByCode(objectCode);
          if (existing) {
            errors.push(`Строка ${i}: Объект с кодом "${objectCode}" уже существует`);
            continue;
          }

          await this.objectsService.create({
            object_code: objectCode,
            name,
            country,
            region: region || undefined,
            city: city || undefined,
            street: street || undefined,
            building: building || undefined,
            structure: structure || undefined,
            is_active: isActive,
          });
          imported++;
        } else if (mode === 'update') {
          // Ищем по коду и обновляем
          const existing = await this.objectsService.findByCode(objectCode);
          if (existing) {
            await this.objectsService.update(existing.id, {
              name,
              country,
              region: region || undefined,
              city: city || undefined,
              street: street || undefined,
              building: building || undefined,
              structure: structure || undefined,
              is_active: isActive,
            });
            updated++;
          } else {
            // Создаем новый, если не найден
            await this.objectsService.create({
              object_code: objectCode,
              name,
              country,
              region: region || undefined,
              city: city || undefined,
              street: street || undefined,
              building: building || undefined,
              structure: structure || undefined,
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
          { header: 'Код объекта', key: 'object_code', width: 15 },
          { header: 'Название', key: 'name', width: 30 },
          { header: 'Страна', key: 'country', width: 15 },
          { header: 'Регион', key: 'region', width: 20 },
          { header: 'Населённый пункт', key: 'city', width: 20 },
          { header: 'Улица', key: 'street', width: 20 },
          { header: 'Дом', key: 'building', width: 10 },
          { header: 'Строение/корпус', key: 'structure', width: 15 },
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
          object_code: 'RU/77/1',
          name: 'БЦ "Москва"',
          country: 'Россия',
          region: 'Москва',
          city: 'Москва',
          street: 'Примерная',
          building: '1',
          structure: '',
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
