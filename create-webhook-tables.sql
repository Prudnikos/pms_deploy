-- Создание таблиц для логирования webhook'ов от Channex

-- Таблица для логирования всех webhook событий
CREATE TABLE IF NOT EXISTS channex_webhooks (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,
    object_type VARCHAR(50),
    object_id VARCHAR(255),
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_event_type ON channex_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_object_id ON channex_webhooks(object_id);
CREATE INDEX IF NOT EXISTS idx_channex_webhooks_received_at ON channex_webhooks(received_at);

-- Таблица для ошибок webhook обработки
CREATE TABLE IF NOT EXISTS channex_webhook_errors (
    id SERIAL PRIMARY KEY,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    payload JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Комментарии
COMMENT ON TABLE channex_webhooks IS 'Логи всех webhook событий от Channex';
COMMENT ON TABLE channex_webhook_errors IS 'Ошибки обработки webhook событий';