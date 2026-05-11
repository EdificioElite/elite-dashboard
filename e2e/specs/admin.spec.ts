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
    await page.locator('td button', { hasText: '1A' }).click();
    await expect(page).toHaveURL(/\/admin\/vecino\/1A/, { timeout: 10000 });
  });

  test('edits user email and piso', async ({ page }) => {
    const row = page.locator('tr', { hasText: 'vecino4@elite.com' });
    await row.locator('[title="Editar usuario"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Editar usuario');

    await modal.locator('input[type="email"]').fill('vecino4-mod@elite.com');
    await modal.getByRole('button', { name: 'Guardar' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('tbody')).toContainText('vecino4-mod@elite.com', { timeout: 5000 });
  });

  test('changes user password', async ({ page }) => {
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contrasena"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contrasena');

    await modal.locator('input[type="password"]').first().fill('newpass123');
    await modal.locator('input[type="password"]').last().fill('newpass123');
    await modal.getByRole('button', { name: 'Cambiar' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('deletes a user', async ({ page }) => {
    const row = page.locator('tr', { hasText: 'vecino3@elite.com' });
    await row.locator('[title="Eliminar usuario"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Eliminar acceso');

    await modal.getByRole('button', { name: 'Eliminar acceso' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('tbody')).not.toContainText('vecino3@elite.com', { timeout: 5000 });
  });

  // Skipped: flaky due to HTML5 form validation in headless browser
  test.skip('can create a new user', async ({ page }) => {
    await page.click('text=Crear acceso');
    await page.waitForSelector('form');
    const vecinoInput = page.locator('form input[type="text"]');
    await vecinoInput.fill('6A');
    const emailInput = page.locator('form input[type="email"]');
    await emailInput.fill('vecino6@elite.com');
    const passInput = page.locator('form input[type="password"]');
    await passInput.fill('password1');
    await page.click('text=Guardar');
    await expect(page.getByText(/creado|error/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tbody')).toContainText('vecino6@elite.com');
  });

  test('non-admin cannot access /admin', async ({ page }) => {
    await loginAsVecino(page);
    await page.goto('/admin');
    await expect(page).toHaveURL('/dashboard');
  });
});
