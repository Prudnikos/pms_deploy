// Прямой тест создания бронирования без логина
const { chromium } = require('playwright');

async function testProductionBookingDirect() {
  console.log('🌍 ПРЯМОЕ ТЕСТИРОВАНИЕ СОЗДАНИЯ БРОНИРОВАНИЯ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔗 URL: https://pms.voda.center');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    // Сначала попробуем залогиниться с реальными данными
    console.log('📱 Переходим на сайт и логинимся...');
    await page.goto('https://pms.voda.center/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Быстрый логин с реальными данными
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'prudnik47@gmail.com');
    await page.fill('input[type="password"]', 'SrakslP57!');
    
    // Найдем и нажмем правильную кнопку
    const signInButton = page.locator('button').filter({ hasText: 'Sign In' }).first();
    await signInButton.click();
    
    // Ждем успешного логина
    await page.waitForTimeout(10000);
    
    let currentUrl = page.url();
    console.log('📍 URL после логина:', currentUrl);
    
    // Проверяем успешность логина
    if (currentUrl.includes('login') || currentUrl === 'https://pms.voda.center/') {
      console.log('🔑 Логин успешен, переходим к Channex...');
      
      // Переходим к Channex интеграции
      console.log('🔗 Переходим к Channex интеграции...');
      await page.goto('https://pms.voda.center/channexintegration', { 
        waitUntil: 'networkidle',
        timeout: 20000 
      });
      
      await page.waitForTimeout(5000);
      
      console.log('📸 Скриншот страницы Channex...');
      await page.screenshot({ 
        path: 'channex-page-after-login.png', 
        fullPage: true 
      });
      
      // Анализируем что есть на странице
      console.log('🔍 Анализируем содержимое страницы...');
      const pageContent = await page.textContent('body');
      
      if (pageContent.includes('Channex')) {
        console.log('✅ Страница содержит Channex контент');
      }
      
      if (pageContent.includes('бронирование') || pageContent.includes('Бронирование')) {
        console.log('✅ Страница содержит контент о бронированиях');
      }
      
      // Попробуем найти любые интерактивные элементы
      const buttons = await page.locator('button').all();
      console.log(`🔍 Найдено кнопок на странице: ${buttons.length}`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const button = buttons[i];
        const text = await button.textContent();
        if (text && text.trim()) {
          console.log(`🔘 Кнопка ${i + 1}: "${text.trim()}"`);
        }
      }
      
      // Ищем табы или вкладки
      const tabs = await page.locator('[role="tab"], .tab, button:has-text("Бронирования")').all();
      console.log(`🔍 Найдено вкладок: ${tabs.length}`);
      
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const text = await tab.textContent();
        console.log(`📑 Вкладка ${i + 1}: "${text}"`);
        
        if (text && (text.includes('Бронирования') || text.includes('Booking'))) {
          console.log('🎯 Найдена вкладка бронирований! Кликаем...');
          await tab.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
      
      // Финальный скриншот
      console.log('📸 Финальный скриншот...');
      await page.screenshot({ 
        path: 'channex-final-state.png', 
        fullPage: true 
      });
      
    } else {
      console.log('❌ Логин не удался, остались на:', currentUrl);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    await page.screenshot({ 
      path: 'error-screenshot.png', 
      fullPage: true 
    });
  }

  await browser.close();
  
  console.log('\n🏁 Тестирование завершено');
  console.log('═══════════════════════════════════════════════════════════');
}

testProductionBookingDirect().catch(console.error);