-- Обновление схемы таблицы bookings для Airbnb/Agoda интеграции
-- Добавляем недостающие колонки

-- Добавляем колонки для гостей
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS infants INTEGER DEFAULT 0;

-- Добавляем колонки для каналов/OTA
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS channel VARCHAR(50),
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS ota_reservation_code VARCHAR(255);

-- Добавляем колонки для номеров и типов
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS room_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS room_title VARCHAR(255);

-- Добавляем финансовые колонки
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Добавляем колонки для контактов гостей
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);

-- Добавляем колонку для заметок
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Добавляем метаданные для интеграций
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS airbnb_meta JSONB,
ADD COLUMN IF NOT EXISTS agoda_meta JSONB;

-- Создаем таблицу для статуса синхронизации
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    total_synced INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем уникальный индекс для каналов
CREATE UNIQUE INDEX IF NOT EXISTS sync_status_channel_idx ON sync_status(channel);

-- Добавляем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS bookings_channel_idx ON bookings(channel);
CREATE INDEX IF NOT EXISTS bookings_source_idx ON bookings(source);
CREATE INDEX IF NOT EXISTS bookings_ota_code_idx ON bookings(ota_reservation_code);
CREATE INDEX IF NOT EXISTS bookings_room_type_idx ON bookings(room_type);

-- Комментарии для документации
COMMENT ON COLUMN bookings.adults IS 'Количество взрослых гостей';
COMMENT ON COLUMN bookings.children IS 'Количество детей';
COMMENT ON COLUMN bookings.channel IS 'Канал бронирования (airbnb, agoda, direct)';
COMMENT ON COLUMN bookings.source IS 'Источник бронирования';
COMMENT ON COLUMN bookings.ota_reservation_code IS 'Код бронирования от OTA';
COMMENT ON COLUMN bookings.room_type IS 'Тип номера';
COMMENT ON COLUMN bookings.total_amount IS 'Общая сумма бронирования';

COMMENT ON TABLE sync_status IS 'Статус синхронизации с внешними каналами';

-- Выводим результат
SELECT 'Database schema updated successfully!' as result;