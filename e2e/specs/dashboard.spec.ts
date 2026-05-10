import { test, expect } from '@playwright/test';
import { loginAsVecino } from '../fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVecino(page);
    await page.waitForSelector('text=Cargando...', { state: 'hidden', timeout: 10000 }).catch(() => {});
  });

  test('shows consumo actual card with kWh values', async ({ page }) => {
    await expect(page.getByText('Consumo actual')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('kWh').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows date range picker in chart', async ({ page }) => {
    await expect(page.getByText('1h')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('7d')).toBeVisible();
    await expect(page.getByText('Año')).toBeVisible();
  });

  test('can switch between presets and see chart data', async ({ page }) => {
    await page.getByText('30d').click();
    await expect(page.getByText('No hay datos en este rango')).not.toBeVisible({ timeout: 15000 });
    await page.getByText('Hoy').click();
    await expect(page.getByText('No hay datos en este rango')).not.toBeVisible({ timeout: 15000 });
  });

  test('shows facturas table with rows', async ({ page }) => {
    await expect(page.locator('h2:has-text("Facturas")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('shows user email in header', async ({ page }) => {
    await expect(page.locator('header')).toContainText('vecino1@elite.com');
  });
});
