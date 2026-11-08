import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  // CORS
  app.enableCors({
    origin: [
      'https://app.checkin-service.com',
      'https://admin.checkin-service.com',
      'http://localhost:3001',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Контроль присутствия API')
    .setDescription('API для системы контроля присутствия на базе BLE-маяков')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентификация')
    .addTag('users', 'Управление пользователями')
    .addTag('objects', 'Управление объектами')
    .addTag('zones', 'Управление зонами')
    .addTag('beacons', 'Управление маяками')
    .addTag('contracts', 'Управление договорами')
    .addTag('attendance', 'Данные присутствия')
    .addTag('sla', 'SLA и нормативы')
    .addTag('fraud', 'Фрод-контроль')
    .addTag('notifications', 'Уведомления')
    .addTag('import-export', 'Импорт/экспорт')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
