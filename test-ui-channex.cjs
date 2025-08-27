const { chromium } = require('playwright');
const path = require('path');

async function testChannexUI() {
  console.log('🧪 Тестируем UI интеграции Channex после исправлений');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  try {
    console.log('1️⃣ Переходим на страницу логина...');
    await page.goto('http://localhost:5174/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('2️⃣ Вводим учетные данные...');
    await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="Enter your email"]', 'admin@test.com');
    await page.fill('input[type="password"], input[placeholder*="password"], input[placeholder*="Enter your password"]', 'password123');
    await page.click('button:has-text("Sign In"), button[type="submit"], .btn:has-text("Sign In")');
    
    console.log('3️⃣ Ожидаем успешного входа...');
    await page.waitForTimeout(3000);
    
    // Проверяем что мы успешно вошли (ищем элементы дашборда)
    try {
      await page.waitForSelector('text=Dashboard', { timeout: 5000 });
      console.log('✅ Вход выполнен успешно');
    } catch (e) {
      console.log('⚠️ Не найден текст Dashboard, но продолжаем...');
    }
    
    console.log('4️⃣ Переходим к интеграции Channex...');
    await page.goto('http://localhost:5174/channexintegration', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('5️⃣ Делаем скриншот страницы интеграции...');
    const screenshot1Path = path.join(__dirname, 'channex-ui-test-page.png');
    await page.screenshot({ 
      path: screenshot1Path, 
      fullPage: true 
    });
    console.log('📸 Скриншот сохранен:', screenshot1Path);
    
    console.log('6️⃣ Ищем кнопки создания тестовых бронирований...');
    
    // Ищем различные варианты кнопок
    const buttonSelectors = [
      'button:has-text("Создать тестовое")',
      'button:has-text("Test")', 
      'button:has-text("Тест")',
      'button[class*="test"]',
      'button:has-text("101")',
      'button:has-text("201")',
      '[data-testid*="test"]',
      'text=101',
      'text=201'
    ];
    
    let foundButtons = [];
    for (const selector of buttonSelectors) {
      try {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          console.log(`   Найдено ${elements.length} элементов для: ${selector}`);
          foundButtons.push({ selector, count: elements.length });
        }
      } catch (e) {
        // Игнорируем ошибки поиска
      }
    }
    
    if (foundButtons.length > 0) {
      console.log('✅ Найдены кнопки тестирования:', foundButtons);
    } else {
      console.log('⚠️ Не найдены кнопки тестирования. Проверяем общий контент...');
      
      // Получаем текст страницы
      const pageText = await page.textContent('body');
      console.log('📄 Первые 500 символов страницы:', pageText.substring(0, 500));
      
      // Ищем любые кнопки на странице
      const allButtons = await page.locator('button').all();
      console.log(`🔍 Всего кнопок на странице: ${allButtons.length}`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        try {
          const buttonText = await allButtons[i].textContent();
          console.log(`   Кнопка ${i + 1}: "${buttonText}"`);
        } catch (e) {
          console.log(`   Кнопка ${i + 1}: [не удалось получить текст]`);
        }
      }
    }
    
    console.log('7️⃣ Ожидаем 5 секунд для изучения страницы...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Ошибка тестирования UI:', error.message);
    
    // Делаем скриншот ошибки
    try {
      const errorScreenshotPath = path.join(__dirname, 'channex-ui-error.png');
      await page.screenshot({ 
        path: errorScreenshotPath, 
        fullPage: true 
      });
      console.log('📸 Скриншот ошибки сохранен:', errorScreenshotPath);
    } catch (screenshotError) {
      console.error('Не удалось сделать скриншот ошибки:', screenshotError);
    }
  }

  await browser.close();
  console.log('\n🏁 Тест UI завершен');
}

testChannexUI().catch(console.error);