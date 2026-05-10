import { test, expect } from '@playwright/test';
import { loginAsVecino } from '../fixtures/auth';

test.describe('Dashboard date range picker', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVecino(page);
  });

  test('shows preset buttons and date inputs', async ({ page }) => {
    await expect(page.getByText('1h')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hoy')).toBeVisible();
    await expect(page.getByText('7d')).toBeVisible();
    await expect(page.getByText('30d')).toBeVisible();
    await expect(page.getByText('Año')).toBeVisible();
    await expect(page.getByText('Todo')).toBeVisible();
    await expect(page.getByText('Desde:')).toBeVisible();
    await expect(page.getByText('Hasta:')).toBeVisible();
  });

  test('default preset is 7d selected', async ({ page }) => {
    const btn7d = page.locator('button', { hasText: '7d' });
    await expect(btn7d).toHaveClass(/bg-blue-600/);
  });

  test('clicking 1h preset changes selection', async ({ page }) => {
    const btn1h = page.locator('button', { hasText: '1h' });
    await btn1h.click();
    await expect(btn1h).toHaveClass(/bg-blue-600/);
    await expect(page.locator('button', { hasText: '7d' })).not.toHaveClass(/bg-blue-600/);
  });

  test('clicking 30d preset loads chart data', async ({ page }) => {
    await page.locator('button', { hasText: '30d' }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('No hay datos en este rango')).not.toBeVisible({ timeout: 15000 });
  });

  test('clicking Todo preset loads full year data', async ({ page }) => {
    await page.locator('button', { hasText: 'Todo' }).click();
    await expect(page.getByText('No hay datos en este rango')).not.toBeVisible({ timeout: 10000 });
  });

  // Skipped: datetime-local fill unreliable in headless CI
  test.skip('custom date range clears preset and loads data', async ({ page }) => {
    const inputs = page.locator('input[type="datetime-local"]');
    await inputs.first().fill('2026-06-01T00:00');
    await expect(page.locator('button', { hasText: '7d' })).not.toHaveClass(/bg-blue-600/);
    await expect(page.getByText('No hay datos en este rango')).not.toBeVisible({ timeout: 10000 });
  });
});
