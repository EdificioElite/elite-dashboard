import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

test.describe('Admin Aerotermia Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/aerotermia');
  });

  test('shows header with Admin title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Aerotermia Admin', { timeout: 10000 });
  });

  test('shows eyebrow text', async ({ page }) => {
    await expect(page.getByText('Panel de administracion')).toBeVisible({ timeout: 10000 });
  });

  test('shows stat cards with values', async ({ page }) => {
    await expect(page.getByText('Total kWh calor')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total kWh frio')).toBeVisible();
    await expect(page.getByText('Total m³ ACS')).toBeVisible();
    await expect(page.getByText('Total facturado')).toBeVisible();
  });

  test('shows date range presets and custom button', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '24h' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: '7 dias' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '30 dias' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '3 meses' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '1 año' })).toBeVisible();
    await expect(page.locator('.eyebrow', { hasText: 'Periodo' })).toBeVisible();
  });

  test('shows all dashboard sections', async ({ page }) => {
    await expect(page.getByText('Distribución por vecino')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Consumo por vecino')).toBeVisible();
    await expect(page.getByText('Histórico — Global')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Facturas' })).toBeVisible();
    await expect(page.getByText('Heatmap')).toBeVisible();
  });

  test('shows facturas chart section', async ({ page }) => {
    await expect(page.getByText('Facturas').first()).toBeVisible({ timeout: 15000 });
  });

  test('preset 24h changes selection', async ({ page }) => {
    await page.getByRole('tab', { name: '24h' }).click();
    await expect(page.getByRole('tab', { name: '24h' })).toHaveAttribute('aria-selected', 'true');
  });

  test('preset 30d changes selection', async ({ page }) => {
    await page.getByRole('tab', { name: '30 dias' }).click();
    await expect(page.getByRole('tab', { name: '30 dias' })).toHaveAttribute('aria-selected', 'true');
  });

  test('preset 1a changes selection', async ({ page }) => {
    await page.getByRole('tab', { name: '1 año' }).click();
    await expect(page.getByRole('tab', { name: '1 año' })).toHaveAttribute('aria-selected', 'true');
  });

  test('factura selector has options', async ({ page }) => {
    const select = page.locator('select');
    await expect(select).toBeVisible({ timeout: 15000 });
  });

  test('non-admin cannot access admin aerotermia', async ({ page }) => {
    await page.click('button.rounded-full');
    await page.click('text=Salir');
    await page.waitForURL('/login');

    await page.fill('input[type="email"]', 'vecino1@elite.com');
    await page.fill('input[type="password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin|aerotermia|inicio)/);

    await page.goto('/admin/aerotermia');
    await expect(page).toHaveURL('/inicio');
  });

  test('navigates to aerotermia from sidebar', async ({ page }) => {
    await page.goto('/admin/vecinos');
    await page.waitForURL('/admin/vecinos');
    await expect(page.getByText('Vecinos').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Aerotermia', exact: true }).last().click();
    await expect(page).toHaveURL('/admin/aerotermia');
  });
});
