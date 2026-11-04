import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../config/database.config';
import { User } from '../../modules/users/entities/user.entity';

const dataSource = new DataSource(dataSourceOptions);

async function runSeeds() {
  await dataSource.initialize();

  console.log('Running seeds...');

  // Создание admin пользователя
  const userRepository = dataSource.getRepository(User);
  
  const existingAdmin = await userRepository.findOne({ where: { login: 'admin' } });
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    const admin = userRepository.create({
      login: 'admin',
      email: 'admin@checkin-service.com',
      full_name: 'Администратор Системы',
      role: 'admin',
      password_hash: passwordHash,
      is_active: true,
    });

    await userRepository.save(admin);
    console.log('✓ Admin user created (login: admin, password: admin123)');
  } else {
    console.log('✓ Admin user already exists');
  }

  // Создание системных настроек
  await dataSource.query(`
    INSERT INTO system_settings (key, value, description) VALUES
    ('aggregation_interval_sec', '600', 'Интервал агрегации данных (секунды)'),
    ('sync_interval_sec', '600', 'Интервал синхронизации (секунды)'),
    ('scan_duty_cycle', '{"scan_duration_ms": 3000, "pause_duration_ms": 7000}', 'Параметры сканирования BLE'),
    ('fraud_thresholds', '{"teleportation_minutes": 5, "min_samples_count": 3}', 'Пороги детекции фрода')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log('✓ System settings created');

  await dataSource.destroy();
  console.log('Seeds completed successfully!');
}

runSeeds().catch((error) => {
  console.error('Error running seeds:', error);
  process.exit(1);
});
