// Простое тестирование production без сложной навигации
const { chromium } = require('playwright');

async function testSimpleProduction() {
  console.log('🌍 ПРОСТОЕ ТЕСТИРОВАНИЕ PRODUCTION');
  console.log('═══════════════════════════════════════════');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    // Логин
    console.log('📱 Логин на https://pms.voda.center...');
    await page.goto('https://pms.voda.center/');
    
    await page.fill('input[type="email"]', 'prudnik47@gmail.com');
    await page.fill('input[type="password"]', 'SrakslP57!');
    
    const signInButton = page.locator('button').filter({ hasText: 'Sign In' }).first();
    await signInButton.click();
    
    await page.waitForTimeout(8000);
    
    console.log('📍 URL после логина:', page.url());
    
    // Скриншот после логина
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    
    // Пробуем разные пути к интеграции
    const possiblePaths = [
      '/channexintegration',
      '/integrations',
      '/channex',
      '/dashboard',
      '/'
    ];
    
    for (const path of possiblePaths) {
      try {
        console.log(`🔍 Пробуем путь: ${path}`);
        await page.goto(`https://pms.voda.center${path}`, { timeout: 10000 });
        
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`✅ Успешно перешли на: ${currentUrl}`);
        
        // Скриншот этой страницы
        await page.screenshot({ path: `page${path.replace('/', '-')}.png`, fullPage: true });
        
        // Анализируем содержимое
        const content = await page.textContent('body');
        if (content.includes('Channex') || content.includes('интеграци')) {
          console.log(`🎯 На странице ${path} найден Channex контент!`);
          
          // Ищем кнопки и формы
          const buttons = await page.locator('button').all();
          console.log(`🔘 Найдено кнопок: ${buttons.length}`);
          
          for (let i = 0; i < Math.min(buttons.length, 5); i++) {
            const text = await buttons[i].textContent();
            if (text && text.trim()) {
              console.log(`  - Кнопка: "${text.trim()}"`);
            }
          }
          
          // Ищем поля ввода
          const inputs = await page.locator('input').all();
          console.log(`📝 Найдено полей ввода: ${inputs.length}`);
        }
        
      } catch (e) {
        console.log(`❌ Не удалось перейти на ${path}: ${e.message}`);
      }
    }
    
    // Попробуем прямо создать API запрос к Channex для тестирования
    console.log('\n🔧 ТЕСТИРУЕМ API НАПРЯМУЮ ИЗ БРАУЗЕРА...');
    
    const apiTest = await page.evaluate(async () => {
      try {
        console.log('🌐 Выполняем API запрос к Channex...');
        
        const testBooking = {
          booking: {
            property_id: '6ae9708a-cbaa-4134-bf04-29314e842709',
            ota_reservation_code: 'BROWSER-TEST-' + Date.now(),
            ota_name: 'Booking.com',
            arrival_date: '2025-09-01',
            departure_date: '2025-09-03',
            currency: 'GBP',
            
            customer: {
              name: 'Browser',
              surname: 'Test',
              mail: 'browser.test@voda.center',
              country: 'GB'
            },
            
            rooms: [{
              room_type_id: '8df610ce-cabb-429d-98d0-90c33f451d97',
              rate_plan_id: '8212ad16-0057-496b-8b0b-54d741841852',
              days: {
                '2025-09-01': '100.00',
                '2025-09-02': '100.00'
              },
              occupancy: { adults: 1, children: 0 }
            }]
          }
        };
        
        const response = await fetch('https://staging.channex.io/api/v1/bookings', {
          method: 'POST',
          headers: {
            'user-api-key': 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testBooking)
        });
        
        const result = await response.text();
        return {
          status: response.status,
          data: result,
          success: response.ok
        };
        
      } catch (error) {
        return {
          error: error.message,
          success: false
        };
      }
    });
    
    if (apiTest.success) {
      console.log('✅ API тест УСПЕШЕН!');
      console.log('📋 Статус:', apiTest.status);
      try {
        const data = JSON.parse(apiTest.data);
        if (data.data && data.data.id) {
          console.log('🎉 ID нового бронирования:', data.data.id);
        }
      } catch (e) {
        console.log('📊 Ответ API:', apiTest.data.substring(0, 200));
      }
    } else {
      console.log('❌ API тест не удался');
      console.log('📊 Ошибка:', apiTest.error || apiTest.data);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
    await page.screenshot({ path: 'general-error.png', fullPage: true });
  }

  await browser.close();
  console.log('\n🏁 Тестирование завершено');
}

testSimpleProduction().catch(console.error);