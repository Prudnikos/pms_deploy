# Настройка интеграции с Channex

Это руководство поможет вам настроить полную интеграцию с Channex Channel Manager для автоматического получения бронирований.

## 1. Подготовка

### 1.1. Установка зависимостей

```bash
npm install
```

### 1.2. Создание таблиц в Supabase

Выполните SQL скрипт из файла `server/database-schema.sql` в вашей Supabase консоли:

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в SQL Editor
3. Скопируйте и выполните содержимое файла `server/database-schema.sql`

## 2. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
# Channex API настройки
VITE_CHANNEX_API_URL=https://staging.channex.io/api/v1
VITE_CHANNEX_API_KEY=ваш_api_ключ_от_channex
VITE_CHANNEX_PROPERTY_ID=ваш_property_id

# Supabase (уже настроено)
VITE_SUPABASE_URL=https://qflncrldkqhmmrnepdpk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Получение API ключей от Channex

### 3.1. Регистрация в Channex

1. Зарегистрируйтесь на [Channex.io](https://www.channex.io/)
2. Создайте тестовый отель в панели управления
3. Получите API ключ в разделе Settings → API

### 3.2. Получение Property ID

Запустите приложение и используйте кнопку "Получить Property ID" в разделе Channex Integration для автоматического определения ID вашего отеля.

## 4. Запуск системы

### 4.1. Полный запуск (рекомендуется)

```bash
npm run dev:full
```

Эта команда запустит:
- Frontend на http://localhost:5173
- Webhook сервер на http://localhost:3001

### 4.2. Раздельный запуск

```bash
# Терминал 1: Frontend
npm run dev

# Терминал 2: Webhook сервер
npm run webhook-server
```

## 5. Настройка Webhook в Channex

### 5.1. Через веб-интерфейс Channex

1. Откройте панель управления Channex: https://staging.channex.io/webhooks
2. Создайте новый webhook со следующими параметрами:
   - **URL**: `http://localhost:3001/api/channex/webhook`
   - **События**: `booking_new`, `booking_modification`, `booking_cancellation`
   - **Headers** (для безопасности):
     ```json
     {
       "Authorization": "Bearer hotel_pms_webhook_secret_2024"
     }
     ```
     или
     ```json
     {
       "X-Webhook-Token": "hotel_pms_webhook_secret_2024"
     }
     ```

### 5.2. Через API (альтернативный способ)

```bash
curl -X POST https://staging.channex.io/api/v1/webhooks \
  -H "user-api-key: ВАШ_API_КЛЮЧ" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "6ae9708a-cbaa-4134-bf04-29314e842709",
    "callback_url": "http://localhost:3001/api/channex/webhook",
    "event_mask": "booking",
    "headers": {
      "Authorization": "Bearer hotel_pms_webhook_secret_2024"
    },
    "send_data": true
  }'
```

## 6. Тестирование интеграции

### 6.1. Проверка подключения

1. Откройте http://localhost:5173
2. Перейдите в раздел "Channex Integration"
3. Нажмите "Тестировать подключение"

### 6.2. Тестирование Webhook'ов

В разделе "Webhooks":
1. Убедитесь, что сервер работает (зеленый статус)
2. Нажмите "Симулировать webhook" для тестирования
3. Создайте тестовое бронирование

### 6.3. Реальное тестирование

1. Создайте тестовое бронирование в панели Channex
2. Проверьте, что webhook поступил в раздел "Webhooks"
3. Убедитесь, что бронирование появилось в разделе "Бронирования"

## 7. Мониторинг

### 7.1. Логи webhook сервера

Сервер выводит подробные логи всех операций:

```bash
🔔 Получен webhook от Channex: {...}
📋 Обработка webhook: booking_new для ID booking_123
✅ Бронирование booking_123 синхронизировано
```

### 7.2. База данных

Все webhook'и сохраняются в таблицы:
- `channex_webhooks` - история всех webhook'ов
- `channex_webhook_errors` - ошибки обработки
- `bookings` - синхронизированные бронирования

## 8. Устранение неполадок

### 8.1. Webhook сервер не запускается

```bash
# Проверьте, свободен ли порт 3001
netstat -an | findstr :3001

# Или используйте другой порт
PORT=3002 npm run webhook-server
```

### 8.2. Webhook'и не поступают

1. Проверьте статус сервера: http://localhost:3001/health
2. Убедитесь, что URL правильно настроен в Channex
3. Проверьте логи сервера на наличие ошибок

### 8.3. API ошибки

1. Проверьте правильность API ключа
2. Убедитесь, что используете staging URL для тестирования
3. Проверьте лимиты API в панели Channex

## 9. Production настройки

### 9.1. Внешний URL для webhook'ов

Для production используйте:
- Ngrok для локального тестирования: `ngrok http 3001`
- Реальный домен: `https://yourdomain.com/api/channex/webhook`

### 9.2. Безопасность

**Важная информация**: На основе исследования документации Channex выяснилось:

1. **Channex НЕ использует HMAC signature verification** для webhook'ов
2. **Вместо этого используются custom headers** для аутентификации
3. **Настройка безопасности**:
   - При создании webhook в Channex добавьте заголовок `Authorization` или `X-Webhook-Token`
   - Значение должно совпадать с `VITE_CHANNEX_WEBHOOK_SECRET` в .env.local
   - Наш сервер проверяет эти заголовки автоматически
4. **Для production**:
   - Используйте HTTPS для всех API запросов
   - Храните API ключи в переменных окружения
   - Используйте более сложный webhook secret

### 9.3. Мониторинг

- Настройте алерты для ошибок webhook'ов
- Используйте логирование для отладки
- Мониторьте производительность API запросов

## 10. Полезные ссылки

- [Channex API Documentation](https://docs.channex.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Webhook Best Practices](https://webhook.site/docs)

## Поддержка

При возникновении вопросов:
1. Проверьте логи приложения
2. Изучите документацию Channex API
3. Используйте панель разработчика для отладки

---

**Важно**: Данная настройка предназначена для разработки. Для production среды требуются дополнительные настройки безопасности и мониторинга.