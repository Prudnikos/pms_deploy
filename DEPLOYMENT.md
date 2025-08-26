# Развертывание Hotel PMS на production

## 🚀 Развертывание на https://pms.voda.center/

### 1. Подготовка к развертыванию

#### Frontend (React приложение):
```bash
# Соберите production build
npm run build

# Загрузите содержимое папки dist/ на сервер
# в папку /var/www/pms.voda.center/
```

#### Backend (Webhook сервер):

**Важно**: Webhook сервер должен работать отдельно от frontend, так как он требует Node.js сервера.

```bash
# Создайте отдельную папку для webhook сервера на сервере:
mkdir -p /var/www/pms-webhook

# Скопируйте следующие файлы на сервер в /var/www/pms-webhook/:
- server/webhook.js
- .env.local (переименовать в .env.production с production API keys)
- package.json
- package-lock.json

# На сервере установите зависимости:
cd /var/www/pms-webhook
npm install --production

# Создайте .env.production с реальными API ключами:
# VITE_CHANNEX_API_URL=https://api.channex.io/api/v1
# VITE_CHANNEX_API_KEY=ВАШ_РЕАЛЬНЫЙ_API_КЛЮЧ
# VITE_CHANNEX_PROPERTY_ID=6ae9708a-cbaa-4134-bf04-29314e842709
# VITE_CHANNEX_WEBHOOK_SECRET=hotel_pms_webhook_secret_production_2024
# VITE_SUPABASE_URL=https://qflncrldkqhmmrnepdpk.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Запустите webhook сервер:
npm run start
```

### 2. Настройка Nginx

Создайте конфигурацию для Nginx:

```nginx
# /etc/nginx/sites-available/pms.voda.center
server {
    listen 443 ssl;
    server_name pms.voda.center;
    
    # SSL сертификаты
    ssl_certificate /path/to/ssl/certificate.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Frontend (React приложение)
    location / {
        root /var/www/pms.voda.center;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Webhook API
    location /api/channex/webhook {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}

# Редирект с HTTP на HTTPS
server {
    listen 80;
    server_name pms.voda.center;
    return 301 https://$server_name$request_uri;
}
```

### 3. Systemd сервис для webhook сервера

Создайте systemd сервис:

```bash
# /etc/systemd/system/hotel-pms-webhook.service
[Unit]
Description=Hotel PMS Webhook Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/pms.voda.center/api
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Запустите сервис:
```bash
sudo systemctl enable hotel-pms-webhook
sudo systemctl start hotel-pms-webhook
sudo systemctl status hotel-pms-webhook
```

### 4. Настройка Channex webhook

В панели Channex создайте webhook с параметрами:

- **Trigger**: `booking`
- **Callback URL**: `https://pms.voda.center/api/channex/webhook`  
- **Headers**:
```json
{
  "Authorization": "Bearer hotel_pms_webhook_secret_production_2024"
}
```

### 5. Проверка работы

1. **Проверьте health check**: https://pms.voda.center/health
2. **Создайте тестовое бронирование** в Channex
3. **Проверьте логи** webhook сервера:
```bash
sudo journalctl -u hotel-pms-webhook -f
```

### 6. Мониторинг

Настройте мониторинг:
- **Uptime мониторинг** для https://pms.voda.center/health
- **Логирование** webhook запросов
- **Алерты** при ошибках webhook обработки

### 7. Безопасность

- ✅ HTTPS подключение
- ✅ Проверка webhook авторизации
- ✅ Firewall настройки (только 80, 443, SSH)
- ✅ Регулярные обновления системы

### 8. Текущий статус развертывания

**⚠️ СТАТУС: Webhook сервер НЕ развернут на production**

- ✅ Frontend развернут на https://pms.voda.center/
- ❌ Webhook сервер НЕ работает на https://pms.voda.center/api/channex/webhook
- ❌ Health check недоступен: https://pms.voda.center/health

**Что нужно сделать:**

1. **Заменить тестовый API ключ**: В `.env.local` все еще используется тестовый API ключ
2. **Развернуть webhook сервер**: Загрузить Node.js сервер на хостинг
3. **Настроить systemd сервис**: Обеспечить автозапуск webhook сервера
4. **Протестировать интеграцию**: Создать тестовое бронирование в Channex

**Локальное тестирование работает:**
- ✅ Webhook сервер запускается локально
- ✅ Health check доступен на http://localhost:3001/health  
- ✅ Webhook endpoint принимает данные на http://localhost:3001/api/channex/webhook

## 🔧 Команды для управления

```bash
# Перезапуск webhook сервера
sudo systemctl restart hotel-pms-webhook

# Просмотр логов
sudo journalctl -u hotel-pms-webhook -n 100

# Проверка статуса
sudo systemctl status hotel-pms-webhook

# Тестирование webhook локально
curl -X POST https://pms.voda.center/api/channex/webhook \
  -H "Authorization: Bearer hotel_pms_webhook_secret_production_2024" \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```