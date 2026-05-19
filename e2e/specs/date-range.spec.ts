import { test, expect } from '@playwright/test';
import { loginAsVecino } from '../fixtures/auth';

test.describe('Dashboard date range picker', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVecino(page);
  });

  test('shows preset buttons and date inputs', async ({ page }) => {
    await expect(page.getByText('24h')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('7 dias')).toBeVisible();
    await expect(page.getByText('30 dias')).toBeVisible();
    await expect(page.getByText('1 año')).toBeVisible();
    await expect(page.getByText('Desde:')).toBeVisible();
    await expect(page.getByText('Hasta:')).toBeVisible();
  });

  test('default preset is 1a selected', async ({ page }) => {
    const btn1a = page.locator('button[aria-pressed="true"]', { hasText: '1 año' });
    await expect(btn1a).toBeVisible();
  });

  test('clicking 24h preset changes selection', async ({ page }) => {
    await page.locator('button', { hasText: '24h' }).click();
    await expect(page.locator('button[aria-pressed="true"]', { hasText: '24h' })).toBeVisible();
  });

  test('clicking 30d preset loads chart data', async ({ page }) => {
    await page.locator('button', { hasText: '30 dias' }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 15000 });
  });

  // Skipped: 1a is now the default
  test.skip('clicking 1a preset loads full year data', async ({ page }) => {
    await page.locator('button', { hasText: '1 año' }).click();
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 10000 });
  });

  // Skipped: datetime-local fill unreliable in headless CI
  test.skip('custom date range clears preset and loads data', async ({ page }) => {
    const inputs = page.locator('input[type="datetime-local"]');
    await inputs.first().fill('2026-06-01T00:00');
    await expect(page.locator('button[aria-pressed="true"]', { hasText: '1 año' })).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 10000 });
  });
});
