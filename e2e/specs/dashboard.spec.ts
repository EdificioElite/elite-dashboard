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

  test('shows consumo chart', async ({ page }) => {
    await expect(page.locator('h2:has-text("Consumo termico y ACS")')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
  });

  test('can change chart range to dia/mes', async ({ page }) => {
    await page.selectOption('select', 'dia');
    await page.waitForTimeout(500);
    await page.selectOption('select', 'mes');
    await page.waitForTimeout(500);
    await expect(page.locator('select')).toHaveValue('mes');
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
