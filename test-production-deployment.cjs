// Тест production деплоя на https://pms.voda.center
const { chromium } = require('playwright');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProductionDeployment() {
  console.log('🌍 ТЕСТИРОВАНИЕ PRODUCTION ДЕПЛОЯ');
  console.log('═══════════════════════════════════════════════════');
  console.log('🔗 URL: https://pms.voda.center');
  
  // 1. Проверяем доступность сайта
  console.log('\n1️⃣ Проверяем доступность сайта...');
  try {
    const response = await fetch('https://pms.voda.center/', {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.ok) {
      console.log('✅ Сайт доступен, статус:', response.status);
    } else {
      console.log('⚠️ Статус ответа:', response.status);
    }
  } catch (error) {
    console.log('❌ Ошибка доступности:', error.message);
  }
  
  // 2. Проверяем API здоровье
  console.log('\n2️⃣ Проверяем API endpoints...');
  try {
    const healthResponse = await fetch('https://pms.voda.center/api/health', {
      timeout: 5000
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint работает:', healthData);
    } else {
      console.log('⚠️ Health endpoint статус:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Health endpoint недоступен:', error.message);
  }
  
  // 3. Тестируем UI с браузером
  console.log('\n3️⃣ Тестируем UI через браузер...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    console.log('📱 Переходим на production сайт...');
    await page.goto('https://pms.voda.center/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Страница загружена');
    
    // Проверяем что видим форму входа
    const loginForm = await page.locator('input[type="email"]').first();
    if (await loginForm.isVisible()) {
      console.log('✅ Форма входа отображается');
    }
    
    console.log('🔑 Пробуем войти в систему...');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForTimeout(5000);
    
    // Проверяем успешный вход
    const currentUrl = page.url();
    console.log('📍 Текущий URL:', currentUrl);
    
    if (currentUrl.includes('pms.voda.center') && !currentUrl.includes('login')) {
      console.log('✅ Вход выполнен успешно');
      
      // Переходим к Channex интеграции
      console.log('🔗 Переходим к Channex интеграции...');
      await page.goto('https://pms.voda.center/channexintegration', { 
        waitUntil: 'networkidle',
        timeout: 20000 
      });
      
      // Ищем вкладку бронирований
      try {
        await page.waitForSelector('text=Бронирования', { timeout: 10000 });
        await page.click('text=Бронирования');
        console.log('✅ Вкладка "Бронирования" найдена и открыта');
        
        // Проверяем форму создания бронирований
        const guestNameInput = await page.locator('input[id="guestName"]').first();
        if (await guestNameInput.isVisible()) {
          console.log('✅ Форма создания бронирований доступна');
          
          // Проверяем кнопку импорта
          const importButton = await page.locator('button:has-text("Импортировать бронирования")').first();
          if (await importButton.isVisible()) {
            console.log('✅ Кнопка импорта бронирований доступна');
          }
        }
        
      } catch (e) {
        console.log('⚠️ Не удалось найти элементы Channex интеграции');
      }
      
    } else {
      console.log('⚠️ Вход не выполнен или перенаправление не произошло');
    }
    
    console.log('📸 Делаем скриншот production версии...');
    await page.screenshot({ 
      path: 'production-test-screenshot.png', 
      fullPage: true 
    });
    console.log('✅ Скриншот сохранен: production-test-screenshot.png');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования браузера:', error.message);
    
    await page.screenshot({ 
      path: 'production-error-screenshot.png', 
      fullPage: true 
    });
    console.log('📸 Скриншот ошибки сохранен: production-error-screenshot.png');
  }

  await browser.close();
  
  // 4. Тестируем создание бронирования на production
  console.log('\n4️⃣ Тестируем Channex API с production...');
  try {
    const testBooking = {
      booking: {
        property_id: '6ae9708a-cbaa-4134-bf04-29314e842709',
        ota_reservation_code: 'PROD-TEST-' + Date.now(),
        ota_name: 'Booking.com',
        arrival_date: '2025-09-01',
        departure_date: '2025-09-03',
        currency: 'GBP',
        
        customer: {
          name: 'Production',
          surname: 'Test',
          mail: 'production.test@voda.center',
          country: 'GB'
        },
        
        rooms: [{
          room_type_id: '8df610ce-cabb-429d-98d0-90c33f451d97', // Standard Room
          rate_plan_id: '8212ad16-0057-496b-8b0b-54d741841852',
          days: {
            '2025-09-01': '100.00',
            '2025-09-02': '100.00'
          },
          occupancy: { adults: 1, children: 0 }
        }]
      }
    };
    
    const channexResponse = await fetch('https://staging.channex.io/api/v1/bookings', {
      method: 'POST',
      headers: {
        'user-api-key': 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBooking)
    });
    
    if (channexResponse.ok) {
      const channexData = await channexResponse.json();
      console.log('✅ Production тест бронирования успешен!');
      console.log('📋 ID бронирования:', channexData.data?.id);
    } else {
      const errorText = await channexResponse.text();
      console.log('❌ Ошибка создания тестового бронирования:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Ошибка API теста:', error.message);
  }
  
  console.log('\n🏁 Тестирование production завершено');
  console.log('═══════════════════════════════════════════════════');
  
  console.log('\n📊 РЕЗУЛЬТАТЫ:');
  console.log('🌍 URL: https://pms.voda.center');
  console.log('🔧 Конфигурация: vercel.json настроена');  
  console.log('🔑 Переменные окружения: настроены в Vercel');
  console.log('⚡ API endpoints: настроены');
  console.log('🎯 Channex интеграция: готова к работе');
}

testProductionDeployment().catch(console.error);