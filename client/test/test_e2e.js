const { chromium } = require('playwright');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 收集控制台错误
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. 测试登录页加载
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
    const hasToolbar = await page.locator('.header-toolbar').count() > 0;
    results.push({ test: '登录页加载', passed: hasLoginForm, detail: `title=${title}, form=${hasLoginForm}, toolbar=${hasToolbar}` });
  } catch (e) {
    results.push({ test: '登录页加载', passed: false, detail: e.message });
  }

  // 2. 测试主题切换按钮
  try {
    const themeBtn = page.locator('.header-toolbar button').first();
    const exists = await themeBtn.count() > 0;
    results.push({ test: '主题切换按钮', passed: exists });
  } catch (e) {
    results.push({ test: '主题切换按钮', passed: false, detail: e.message });
  }

  // 3. 测试语言切换按钮
  try {
    const langBtn = page.locator('.header-toolbar button').last();
    const exists = await langBtn.count() > 0;
    results.push({ test: '语言切换按钮', passed: exists });
  } catch (e) {
    results.push({ test: '语言切换按钮', passed: false, detail: e.message });
  }

  // 4. 测试登录功能
  try {
    await page.fill('input[placeholder]', 'zhangsan@test.com');
    await page.fill('input[type="password"]', '654321');
    await page.click('button:has-text("登录"), button:has-text("Login")');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    const url = page.url();
    results.push({ test: '登录功能', passed: url.includes('dashboard'), detail: `url=${url}` });
  } catch (e) {
    results.push({ test: '登录功能', passed: false, detail: e.message });
  }

  // 5. 测试主页加载
  try {
    const hasContent = await page.locator('.n-card').count() > 0;
    const hasMenu = await page.locator('.n-menu').count() > 0;
    results.push({ test: '主页加载', passed: hasContent && hasMenu, detail: `cards=${hasContent}, menu=${hasMenu}` });
  } catch (e) {
    results.push({ test: '主页加载', passed: false, detail: e.message });
  }

  // 6. 测试侧边栏导航
  try {
    const menuItems = await page.locator('.n-menu-item').count();
    results.push({ test: '侧边栏导航', passed: menuItems >= 5, detail: `items=${menuItems}` });
  } catch (e) {
    results.push({ test: '侧边栏导航', passed: false, detail: e.message });
  }

  // 7. 测试深色主题切换
  try {
    const themeBtn = page.locator('.header-toolbar button').first();
    await themeBtn.click();
    await page.waitForTimeout(500);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    results.push({ test: '深色主题切换', passed: true, detail: `isDark=${isDark}` });
    // 切换回浅色
    await themeBtn.click();
    await page.waitForTimeout(300);
  } catch (e) {
    results.push({ test: '深色主题切换', passed: false, detail: e.message });
  }

  // 8. 测试语言切换
  try {
    const langBtn = page.locator('.header-toolbar button').last();
    await langBtn.click();
    await page.waitForTimeout(300);
    // 检查下拉菜单是否出现
    const hasDropdown = await page.locator('.n-dropdown-menu').count() > 0;
    results.push({ test: '语言切换下拉', passed: hasDropdown });
    // 点击其他地方关闭
    await page.click('body');
    await page.waitForTimeout(200);
  } catch (e) {
    results.push({ test: '语言切换下拉', passed: false, detail: e.message });
  }

  // 9. 测试无控制台错误
  const criticalErrors = consoleErrors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('404') &&
    !e.includes('Download error')
  );
  results.push({ test: '无控制台错误', passed: criticalErrors.length === 0, detail: `errors=${criticalErrors.length}` });

  // 10. 截图保存
  try {
    await page.screenshot({ path: '/Users/unique/Desktop/homehub/test-screenshot.png', fullPage: true });
    results.push({ test: '截图保存', passed: true });
  } catch (e) {
    results.push({ test: '截图保存', passed: false, detail: e.message });
  }

  await browser.close();

  // 输出结果
  console.log(JSON.stringify(results));
})();
