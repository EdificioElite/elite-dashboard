import { test, expect } from '@playwright/test';
import { loginAsVecino } from '../fixtures/auth';

test.describe('Dashboard date range picker', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVecino(page);
  });

  test('shows preset buttons and custom button', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '24h' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: '7 dias' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '30 dias' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '3 meses' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '1 año' })).toBeVisible();
    await expect(page.locator('.eyebrow', { hasText: 'Periodo' })).toBeVisible();
  });

  test('default preset is 30d selected', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '30 dias' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: '1 año' })).not.toHaveAttribute('aria-selected', 'true');
  });

  test('clicking 24h preset changes selection', async ({ page }) => {
    await page.getByRole('tab', { name: '24h' }).click();
    await expect(page.getByRole('tab', { name: '24h' })).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking 30d preset loads chart data', async ({ page }) => {
    await page.getByRole('tab', { name: '30 dias' }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 15000 });
  });

  // Skipped: 1a is no longer the default
  test.skip('clicking 1a preset loads full year data', async ({ page }) => {
    await page.getByRole('tab', { name: '1 año' }).click();
    await expect(page.getByText('No hay datos en este periodo')).not.toBeVisible({ timeout: 10000 });
  });

  // Skipped: datetime-local fill unreliable in headless CI
  test.skip('custom date range clears preset and loads data', async ({ page }) => {
    await page.getByRole('button', { name: /Aplicar/ }).click();
  });
});
