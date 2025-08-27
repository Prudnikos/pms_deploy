// Тест создания бронирования через PMS UI на production
const { chromium } = require('playwright');

async function testProductionBookingUI() {
  console.log('🌍 ТЕСТИРОВАНИЕ СОЗДАНИЯ БРОНИРОВАНИЯ НА PRODUCTION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔗 URL: https://pms.voda.center');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 2000
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
    
    console.log('🔑 Входим в систему...');
    
    // Убеждаемся что поля видны
    await page.waitForSelector('input[type="email"]');
    await page.waitForSelector('input[type="password"]');
    
    console.log('📝 Заполняем email...');
    await page.fill('input[type="email"]', 'prudnik47@gmail.com');
    
    console.log('📝 Заполняем пароль...');
    await page.fill('input[type="password"]', 'SrakslP57!');
    
    // Находим точную кнопку Sign In (НЕ Google)
    console.log('🔍 Ищем кнопку Sign In...');
    const signInButtons = await page.locator('button').all();
    
    let regularSignInButton = null;
    for (const button of signInButtons) {
      const text = await button.textContent();
      console.log('🔍 Найдена кнопка:', text);
      
      if (text && text.trim() === 'Sign In' && !(await button.textContent()).includes('Google')) {
        regularSignInButton = button;
        break;
      }
    }
    
    if (regularSignInButton) {
      console.log('✅ Найдена правильная кнопка Sign In');
      await regularSignInButton.click();
    } else {
      console.log('⚠️ Не найдена обычная кнопка Sign In, пробуем по селектору');
      await page.click('button[type="submit"]:not(:has-text("Google"))');
    }
    
    // Ждем перенаправления после входа
    console.log('⏳ Ждем перенаправления...');
    await page.waitForTimeout(8000);
    
    let currentUrl = page.url();
    console.log('📍 URL после входа:', currentUrl);
    
    if (currentUrl.includes('login')) {
      console.log('⚠️ Остались на странице логина, пробуем еще раз...');
      await page.waitForTimeout(3000);
      currentUrl = page.url();
      console.log('📍 URL через 3 секунды:', currentUrl);
    }
    
    // Переходим к Channex интеграции
    console.log('🔗 Переходим к Channex интеграции...');
    await page.goto('https://pms.voda.center/channexintegration', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    console.log('📸 Скриншот страницы интеграции...');
    await page.screenshot({ 
      path: 'channex-integration-page.png', 
      fullPage: true 
    });
    
    // Ищем вкладку бронирований
    try {
      console.log('🔍 Ищем вкладку "Бронирования"...');
      await page.waitForSelector('text=Бронирования', { timeout: 10000 });
      await page.click('text=Бронирования');
      console.log('✅ Вкладка "Бронирования" найдена и открыта');
      
      await page.waitForTimeout(3000);
      
      // Ищем форму создания бронирования
      console.log('🔍 Ищем форму создания бронирования...');
      
      // Проверяем наличие полей формы
      const guestNameInput = await page.locator('input[id="guestName"]').first();
      const emailInput = await page.locator('input[id="guestEmail"]').first();
      const phoneInput = await page.locator('input[id="guestPhone"]').first();
      const roomSelect = await page.locator('select').first();
      
      if (await guestNameInput.isVisible()) {
        console.log('✅ Форма создания бронирований найдена');
        
        // Заполняем форму тестовыми данными
        console.log('📝 Заполняем форму бронирования...');
        
        await guestNameInput.fill('Test Production User');
        await emailInput.fill('test.production@voda.center');
        await phoneInput.fill('+7 999 888 7766');
        
        // Выбираем комнату
        await roomSelect.selectOption('101');
        console.log('✅ Форма заполнена тестовыми данными');
        
        // Ищем кнопку создания
        const createButton = await page.locator('button:has-text("Создать бронирование")').first();
        
        if (await createButton.isVisible()) {
          console.log('🎯 Создаем тестовое бронирование...');
          
          // Слушаем сетевые запросы
          let apiRequestMade = false;
          let apiResponse = null;
          
          page.on('response', response => {
            if (response.url().includes('staging.channex.io')) {
              console.log('📡 Обнаружен запрос к Channex:', response.url());
              console.log('📊 Статус ответа:', response.status());
              apiRequestMade = true;
              apiResponse = response;
            }
          });
          
          page.on('console', msg => {
            if (msg.type() === 'error') {
              console.log('❌ Ошибка в консоли браузера:', msg.text());
            } else if (msg.text().includes('Channex') || msg.text().includes('API')) {
              console.log('🔍 Лог:', msg.text());
            }
          });
          
          await createButton.click();
          
          // Ждем выполнения запроса
          await page.waitForTimeout(10000);
          
          if (apiRequestMade) {
            console.log('✅ API запрос к Channex выполнен!');
            console.log('📡 Статус:', apiResponse.status());
            
            if (apiResponse.status() === 200 || apiResponse.status() === 201) {
              console.log('🎉 УСПЕХ! Бронирование создано через production UI!');
            } else {
              console.log('⚠️ Запрос выполнен, но статус не успешный:', apiResponse.status());
            }
          } else {
            console.log('⚠️ API запрос к Channex не обнаружен');
          }
          
          console.log('📸 Финальный скриншот...');
          await page.screenshot({ 
            path: 'production-booking-test-result.png', 
            fullPage: true 
          });
          
        } else {
          console.log('⚠️ Кнопка "Создать бронирование" не найдена');
        }
        
      } else {
        console.log('⚠️ Форма создания бронирования не найдена');
      }
      
    } catch (e) {
      console.log('⚠️ Не удалось найти вкладку бронирований:', e.message);
      
      // Попробуем найти другие элементы на странице
      console.log('🔍 Анализируем доступные элементы на странице...');
      
      const pageText = await page.textContent('body');
      if (pageText.includes('Channex')) {
        console.log('✅ Страница содержит Channex контент');
      }
      
      if (pageText.includes('бронирование') || pageText.includes('booking')) {
        console.log('✅ Страница содержит контент о бронированиях');
      }
      
      console.log('📸 Скриншот для анализа...');
      await page.screenshot({ 
        path: 'production-channex-page-debug.png', 
        fullPage: true 
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    
    await page.screenshot({ 
      path: 'production-booking-error.png', 
      fullPage: true 
    });
  }

  await browser.close();
  
  console.log('\n🏁 Тестирование завершено');
  console.log('═══════════════════════════════════════════════════════════');
}

testProductionBookingUI().catch(console.error);