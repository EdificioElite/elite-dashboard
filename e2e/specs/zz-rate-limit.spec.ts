import { test, expect } from '@playwright/test';

test.skip('rate limiting blocks after 3 failed attempts', async ({ page }) => {
  // Skipped: tested in middleware.test.ts. Requires DISABLE_RATE_LIMIT=false.
  await page.goto('/login');
  for (let i = 0; i < 3; i++) {
    await page.fill('input[type="email"]', 'a@a.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.bg-red-100');
  }
  await page.fill('input[type="email"]', 'a@a.com');
  await page.fill('input[type="password"]', 'wrong');
  await page.click('button[type="submit"]');
  await expect(page.locator('.bg-red-100')).toContainText('Demasiados intentos');
});
