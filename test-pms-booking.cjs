// Тест создания бронирования через PMS с синхронизацией в Channex
const { chromium } = require('playwright');

async function testPMSBooking() {
  console.log('🧪 Тестируем создание бронирования через PMS');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    console.log('1️⃣ Логинимся в PMS...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForTimeout(3000);

    console.log('2️⃣ Переходим к Channex интеграции...');
    await page.goto('http://localhost:5174/channexintegration', { waitUntil: 'networkidle' });
    
    console.log('3️⃣ Переходим на вкладку "Бронирования"...');
    
    // Ищем и кликаем на вкладку бронирований
    try {
      await page.waitForSelector('text=Бронирования', { timeout: 10000 });
      await page.click('text=Бронирования');
      console.log('✅ Кликнули на вкладку "Бронирования"');
    } catch (e) {
      console.log('⚠️ Не найдена вкладка "Бронирования", пробуем альтернативные селекторы...');
      
      // Попробуем найти по тексту с иконкой
      const bookingSelectors = [
        'button:has-text("Бронирования")',
        '[role="tab"]:has-text("Бронирования")', 
        'text=Бронирования',
        '[data-value="bookings"]'
      ];
      
      let found = false;
      for (const selector of bookingSelectors) {
        try {
          await page.click(selector);
          console.log(`✅ Нашли вкладку бронирований: ${selector}`);
          found = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!found) {
        console.log('❌ Не удалось найти вкладку бронирований');
        // Делаем скриншот для отладки
        await page.screenshot({ path: 'debug-channex-tabs.png', fullPage: true });
        console.log('📸 Скриншот сохранен: debug-channex-tabs.png');
      }
    }

    await page.waitForTimeout(2000);

    console.log('4️⃣ Заполняем форму создания бронирования...');
    
    // Заполняем данные гостя
    await page.fill('input[id="guestName"]', 'Test');
    await page.fill('input[id="guestSurname"]', 'User');
    await page.fill('input[id="guestEmail"]', 'test.user@example.com');
    await page.fill('input[id="guestPhone"]', '+44 123 456 789');
    
    // Устанавливаем даты (завтра и послезавтра)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = dayAfter.toISOString().split('T')[0];
    
    await page.fill('input[id="checkIn"]', checkIn);
    await page.fill('input[id="checkOut"]', checkOut);
    
    // Выбираем номер 201 (Deluxe Room)
    await page.click('select[id="roomNumber"]');
    await page.selectOption('select', '201');
    
    // Добавляем примечания
    await page.fill('textarea[id="notes"]', 'Тестовое бронирование через PMS интерфейс');

    console.log('5️⃣ Создаем бронирование...');
    
    // Кликаем кнопку создания
    await page.click('button:has-text("Создать бронирование")');
    
    console.log('6️⃣ Ожидаем результат...');
    
    // Ждем результат (успех или ошибка)
    await page.waitForTimeout(10000);
    
    // Проверяем наличие сообщения об успехе
    const successMessage = await page.locator('text=успешно создано').first();
    const errorMessage = await page.locator('text=Ошибка').first();
    
    if (await successMessage.isVisible()) {
      console.log('✅ Бронирование создано успешно!');
      
      // Пытаемся извлечь ID бронирований
      const pmsIdBadge = page.locator('text=PMS ID:');
      const channexIdBadge = page.locator('text=Channex ID:');
      
      if (await pmsIdBadge.isVisible()) {
        const pmsIdText = await pmsIdBadge.textContent();
        console.log('📋', pmsIdText);
      }
      
      if (await channexIdBadge.isVisible()) {
        const channexIdText = await channexIdBadge.textContent();
        console.log('📋', channexIdText);
      }
      
    } else if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      console.log('❌ Ошибка создания бронирования:', errorText);
    } else {
      console.log('⚠️ Неопределенный результат, делаем скриншот...');
    }

    console.log('7️⃣ Делаем финальный скриншот...');
    await page.screenshot({ path: 'pms-booking-result.png', fullPage: true });
    console.log('📸 Скриншот результата сохранен: pms-booking-result.png');

    console.log('8️⃣ Проверяем импорт существующих бронирований...');
    
    // Кликаем кнопку импорта
    try {
      await page.click('button:has-text("Импортировать бронирования")');
      console.log('✅ Запустили импорт бронирований');
      
      await page.waitForTimeout(5000);
      
      // Проверяем результат импорта
      const importSuccess = await page.locator('text=Импорт завершен').first();
      if (await importSuccess.isVisible()) {
        const importText = await importSuccess.textContent();
        console.log('✅ Импорт завершен:', importText);
      }
      
    } catch (e) {
      console.log('⚠️ Не удалось запустить импорт:', e.message);
    }

    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    
    await page.screenshot({ path: 'pms-booking-error.png', fullPage: true });
    console.log('📸 Скриншот ошибки сохранен: pms-booking-error.png');
  }

  await browser.close();
  console.log('\n🏁 Тест PMS бронирования завершен');
}

testPMSBooking().catch(console.error);