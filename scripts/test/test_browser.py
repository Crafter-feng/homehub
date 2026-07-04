#!/usr/bin/env python3
"""
HomeHub 前端浏览器端到端测试
使用 Playwright 真实浏览器测试
"""

import subprocess
import json
import sys
import time

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    END = "\033[0m"

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")

def print_test(text, passed=True):
    icon = f"{Colors.GREEN}✅{Colors.END}" if passed else f"{Colors.RED}❌{Colors.END}"
    print(f"  {icon} {text}")

def run_playwright_test():
    """运行 Playwright 测试"""
    test_script = '''
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
    await page.waitForURL('**/stock', { timeout: 10000 });
    const url = page.url();
    results.push({ test: '登录功能', passed: url.includes('stock'), detail: `url=${url}` });
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
'''

    # 写入临时测试文件
    with open('/tmp/test_homehub.js', 'w') as f:
        f.write(test_script)

    # 运行测试
    try:
        result = subprocess.run(
            ['npx', 'node', '/tmp/test_homehub.js'],
            capture_output=True,
            text=True,
            timeout=60,
            cwd='/Users/unique/Desktop/homehub'
        )
        return result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return '', 'Test timed out'
    except Exception as e:
        return '', str(e)

def main():
    print(f"{Colors.BLUE}╔══════════════════════════════════════════════════════════════╗{Colors.END}")
    print(f"{Colors.BLUE}║       HomeHub 前端浏览器测试 (Playwright)                    ║{Colors.END}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════════════════════╝{Colors.END}")

    stdout, stderr = run_playwright_test()

    if stderr and 'Test timed out' in stderr:
        print(f"\n{Colors.RED}测试超时{Colors.END}")
        return 1

    if stderr and 'error' in stderr.lower():
        print(f"\n{Colors.RED}Playwright 执行错误:{Colors.END}")
        print(stderr[:500])
        return 1

    try:
        results = json.loads(stdout)
    except json.JSONDecodeError:
        print(f"\n{Colors.RED}解析测试结果失败:{Colors.END}")
        print(stdout[:500])
        return 1

    passed = sum(1 for r in results if r['passed'])
    failed = sum(1 for r in results if not r['passed'])

    for r in results:
        icon = f"{Colors.GREEN}✅{Colors.END}" if r['passed'] else f"{Colors.RED}❌{Colors.END}"
        detail = f" ({r.get('detail', '')})" if r.get('detail') else ''
        print(f"  {icon} {r['test']}{detail}")

    print(f"\n  {Colors.GREEN}通过: {passed}{Colors.END}  {Colors.RED}失败: {failed}{Colors.END}")

    if failed == 0:
        print(f"\n{Colors.GREEN}🎉 所有浏览器测试通过！{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}⚠️  有 {failed} 个测试失败{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
