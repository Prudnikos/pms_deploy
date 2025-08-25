-- Создание таблиц для обработки Channex webhooks

-- Таблица для логирования всех входящих webhooks от Channex
CREATE TABLE IF NOT EXISTS channex_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_id TEXT,
    object_type TEXT,
    object_id TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для логирования ошибок webhook обработки
CREATE TABLE IF NOT EXISTS channex_webhook_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    payload JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица бронирований (если еще не существует)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_booking_id TEXT UNIQUE, -- ID из Channex
    source TEXT DEFAULT 'direct', -- booking, airbnb, expedia, direct, etc.
    
    -- Основная информация о бронировании
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, checked_in, checked_out
    
    -- Информация о госте
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    guests_count INTEGER DEFAULT 1,
    
    -- Финансовая информация
    total_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'RUB',
    
    -- Дополнительная информация
    room_type TEXT,
    room_number TEXT,
    notes TEXT,
    special_requests TEXT,
    
    -- Channex данные
    channex_data JSONB, -- Оригинальные данные от Channex
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_event_type ON channex_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_object_id ON channex_webhooks(object_id);
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_received_at ON channex_webhooks(received_at);
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_processed ON channex_webhooks(processed);

CREATE INDEX IF NOT EXISTS idx_bookings_external_id ON bookings(external_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out ON bookings(check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at в таблице bookings
CREATE OR REPLACE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies для безопасности
ALTER TABLE channex_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_webhook_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Политики для webhooks (только для аутентифицированных пользователей)
CREATE POLICY "Allow authenticated users to view webhooks" ON channex_webhooks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view webhook errors" ON channex_webhook_errors
    FOR SELECT USING (auth.role() = 'authenticated');

-- Политики для бронирований (полный доступ для аутентифицированных пользователей)
CREATE POLICY "Allow authenticated users full access to bookings" ON bookings
    FOR ALL USING (auth.role() = 'authenticated');

-- Комментарии для документации
COMMENT ON TABLE channex_webhooks IS 'Логирование всех входящих webhook уведомлений от Channex';
COMMENT ON TABLE channex_webhook_errors IS 'Логирование ошибок при обработке webhook уведомлений';
COMMENT ON TABLE bookings IS 'Основная таблица бронирований отеля';

COMMENT ON COLUMN bookings.external_booking_id IS 'Уникальный ID бронирования из внешней системы (Channex, Booking.com и т.д.)';
COMMENT ON COLUMN bookings.source IS 'Источник бронирования: direct, booking, airbnb, expedia, etc.';
COMMENT ON COLUMN bookings.channex_data IS 'Оригинальные данные от Channex API в формате JSONB';