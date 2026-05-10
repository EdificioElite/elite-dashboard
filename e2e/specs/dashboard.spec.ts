import { test, expect } from '@playwright/test';
import { loginAsVecino } from '../fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVecino(page);
    await page.waitForSelector('text=Cargando tus datos', { state: 'hidden', timeout: 10000 }).catch(() => {});
  });

  test('shows consumo actual card with kWh values', async ({ page }) => {
    await expect(page.locator('#envivo').getByText('En vivo')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('kWh').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows date range picker in chart', async ({ page }) => {
    await expect(page.getByText('24h')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('7 dias')).toBeVisible();
    await expect(page.getByText('1 año')).toBeVisible();
  });

  test('can switch between presets and see chart data', async ({ page }) => {
    await page.getByText('30 dias').click();
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 15000 });
    await page.getByText('24h').click();
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 15000 });
  });

  test('shows facturas table with rows', async ({ page }) => {
    await expect(page.getByText('Facturas').first()).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('shows user piso and email', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('2A');
    await page.click('.sticky button.rounded-full');
    await expect(page.locator('.sticky .absolute')).toContainText('vecino1@elite.com');
  });
});
