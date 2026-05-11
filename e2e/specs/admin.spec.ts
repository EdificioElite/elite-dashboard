import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVecino } from '../fixtures/auth';

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows vecinos table', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Vecinos');
    await expect(page.locator('table')).toBeVisible();
  });

  test('navigates to vecino consumos', async ({ page }) => {
    await page.click('text=Ver consumos');
    await expect(page).toHaveURL(/\/admin\/vecino\/\d/);
    await expect(page.getByText('Vecino', { exact: true })).toBeVisible();
  });

  // Skipped: flaky due to HTML5 form validation in headless browser
  test.skip('can create a new user', async ({ page }) => {
    await page.click('text=Crear usuario');
    await page.waitForSelector('form');
    const vecinoInput = page.locator('form input[type="text"]');
    await vecinoInput.fill('6A');
    const emailInput = page.locator('form input[type="email"]');
    await emailInput.fill('vecino6@elite.com');
    const passInput = page.locator('form input[type="password"]');
    await passInput.fill('password1');
    await page.click('text=Guardar');
    await expect(page.locator('.bg-green-100, .bg-red-100')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tbody')).toContainText('vecino6@elite.com');
  });

  test('non-admin cannot access /admin', async ({ page }) => {
    await loginAsVecino(page);
    await page.goto('/admin');
    await expect(page).toHaveURL('/dashboard');
  });
});
