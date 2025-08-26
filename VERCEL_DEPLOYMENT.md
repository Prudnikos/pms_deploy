# 🚀 Развертывание webhook сервера на Vercel

## Готово к развертыванию!

Мы создали Vercel API Routes для webhook сервера. Теперь нужно загрузить изменения на хостинг.

### 📁 Созданные файлы:

1. **`/api/channex/webhook.js`** - Main webhook endpoint
2. **`/api/health.js`** - Health check endpoint  
3. **`/vercel.json`** - Vercel configuration с переменными окружения
4. **Обновлен `WebhookManager.jsx`** - Автоматическое определение URL (localhost/production)

### 🔧 Что будет работать после развертывания:

- ✅ **Webhook endpoint**: `https://pms.voda.center/api/channex/webhook`
- ✅ **Health check**: `https://pms.voda.center/api/health`
- ✅ **Автоматическое определение окружения** в UI
- ✅ **Переменные окружения** настроены в `vercel.json`

### 🚀 Следующие шаги:

#### 1. Загрузите изменения на GitHub/Vercel
```bash
git add .
git commit -m "feat: Add Vercel API routes for Channex webhook server

🔧 Generated with Claude Code (claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

#### 2. Vercel автоматически пересоберет сайт
- Webhook endpoint будет доступен через несколько минут
- API routes будут работать как serverless функции

#### 3. Протестируйте endpoints:
```bash
# Health check
curl https://pms.voda.center/api/health

# Webhook test
curl -X POST https://pms.voda.center/api/channex/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hotel_pms_webhook_secret_production_2024" \
  -d '{"test": "webhook", "type": "booking", "object_type": "booking", "object_id": "test123"}'
```

#### 4. Настройте webhook в Channex:
- **URL**: `https://pms.voda.center/api/channex/webhook`
- **Headers**: `Authorization: Bearer hotel_pms_webhook_secret_production_2024`
- **Events**: `booking` events

### ✅ Преимущества Vercel API Routes:

- 🚀 **Serverless** - никаких серверов для управления
- 🔄 **Автоматическое масштабирование** - выдерживает любую нагрузку  
- 💰 **Экономично** - платите только за использование
- 🛡️ **Безопасно** - HTTPS из коробки
- ⚡ **Быстро** - глобальная CDN сеть Vercel

### 🔍 Мониторинг:

После развертывания проверьте:
1. **Vercel Dashboard** - логи функций
2. **UI Webhooks tab** - статус сервера 
3. **Supabase logs** - webhook'и в БД

### 🎯 Текущий статус:
- ✅ **Код готов** - все файлы созданы
- ⏳ **Ожидание развертывания** - нужно push на GitHub
- 🎯 **Готовность**: 95% (осталось только deploy)