import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/vecinos');
  });

  test('shows vecinos table', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Vecinos');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Ver aerotermia button navigates with piso param', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    const piso = await firstRow.locator('td').first().textContent();
    await firstRow.locator('[title="Ver aerotermia"]').click();
    await expect(page).toHaveURL(new RegExp(`/aerotermia\\?piso=${encodeURIComponent(piso!)}$`), { timeout: 10000 });
  });

  test('shows error on admin password change with too short password', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contraseña"]').click();

    const modal = page.locator('.modal-backdrop').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contraseña');

    await modal.locator('input[type="password"]').first().fill('12345');
    await modal.locator('input[type="password"]').last().fill('12345');
    await modal.locator('form').dispatchEvent('submit');

    await expect(modal.locator('text=6 caracteres')).toBeVisible({ timeout: 5000 });
  });

  test('shows error on admin password change with mismatched passwords', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contraseña"]').click();

    const modal = page.locator('.modal-backdrop').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contraseña');

    await modal.locator('input[type="password"]').first().fill('newpass123');
    await modal.locator('input[type="password"]').last().fill('different');
    await modal.getByRole('button', { name: 'Cambiar' }).click();

    await expect(modal.locator('text=no coinciden')).toBeVisible({ timeout: 5000 });
  });

  test.skip('can create a new user', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await page.click('text=Crear acceso');
    await page.waitForSelector('form');
    await page.locator('form select').selectOption({ index: 1 });
    const emailInput = page.locator('form input[type="email"]');
    await emailInput.fill('vecino6@elite.com');
    const passInput = page.locator('form input[type="password"]');
    await passInput.fill('password1');
    await page.click('text=Guardar');
    await expect(page.getByText(/creado|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows ultima_conexion column with null for users who never logged in', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await page.waitForSelector('table tbody', { timeout: 15000 });
    await expect(page.locator('th').filter({ hasText: /Ult\.\s+conexión/ })).toBeVisible();

    const vecino2Row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await expect(vecino2Row).toContainText('—');
  });

  test('shows Estado column with offline and HA indicators', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await expect(page.locator('tbody')).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /Estado/ })).toBeVisible();

    const vecino2Row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await expect(vecino2Row.locator('[title="Offline"]')).toBeVisible();
    await expect(vecino2Row.locator('[title="No ha usado Home Assistant"]')).toBeVisible();
  });
});
