-- Расширение для работы с иерархическими данными (зоны)
CREATE EXTENSION IF NOT EXISTS ltree;

-- Расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Расширение для шифрования
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Проверка установки
\echo 'Database extensions installed successfully!'
