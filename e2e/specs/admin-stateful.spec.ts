import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginAsAdmin, loginAsVecino, logout } from '../fixtures/auth';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function restoreUserPassword(api: APIRequestContext, email: string, password: string) {
  const loginRes = await api.post('/api/auth/login', {
    data: { email: 'admin@elite.com', password: 'admin123' },
  });
  const { token } = await loginRes.json();

  const usersRes = await api.get('/api/admin/usuarios', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const users = await usersRes.json();
  const user = users.find((u: any) => u.email === email);
  if (!user) throw new Error(`Usuario ${email} no encontrado`);

  await api.put(`/api/admin/usuarios/${user.id}/password`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { password },
  });
}

test.describe('Admin (stateful)', () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/vecinos');
  });

  test('edits user email and piso', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino4@elite.com' });
    await row.locator('[title="Editar usuario"]').click();

    const modal = page.locator('.modal-backdrop').last();
    await expect(modal.locator('.eyebrow')).toContainText('Editar usuario');

    await modal.locator('input[type="email"]').fill('vecino4-mod@elite.com');
    await modal.getByRole('button', { name: 'Guardar' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('tbody')).toContainText('vecino4-mod@elite.com', { timeout: 5000 });
  });

  test('changes user password', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contraseña"]').click();

    const modal = page.locator('.modal-backdrop').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contraseña');

    await modal.locator('input[type="password"]').first().fill('newpass123');
    await modal.locator('input[type="password"]').last().fill('newpass123');
    await modal.getByRole('button', { name: 'Cambiar' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });

    await restoreUserPassword(api, 'vecino2@elite.com', 'password1');
  });

  test('deletes a user', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino3@elite.com' });
    await row.locator('[title="Eliminar usuario"]').click();

    const modal = page.locator('.modal-backdrop').last();
    await expect(modal.locator('.eyebrow')).toContainText('Eliminar acceso');

    await modal.getByRole('button', { name: 'Eliminar acceso' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('tbody')).not.toContainText('vecino3@elite.com', { timeout: 5000 });
  });

  test('ultima_conexion updates after vecino logs in', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await page.waitForSelector('table tbody', { timeout: 15000 });

    await logout(page);
    await loginAsVecino(page);

    await logout(page);
    await loginAsAdmin(page);

    await page.goto('/admin/usuarios');
    await expect(page.locator('tbody')).toBeVisible();
    const vecino1RowAfter = page.locator('tr', { hasText: 'vecino1@elite.com' });
    await expect(vecino1RowAfter).toContainText(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
  });

  test('online indicator turns green after vecino logs in', async ({ page }) => {
    await logout(page);
    await loginAsVecino(page);

    await logout(page);
    await loginAsAdmin(page);

    await page.goto('/admin/usuarios');
    await expect(page.locator('tbody')).toBeVisible();
    const vecino1Row = page.locator('tr', { hasText: 'vecino1@elite.com' });
    await expect(vecino1Row.locator('[title="Online"]')).toBeVisible({ timeout: 5000 });
  });

  test('HA check turns green after HA-source login and consumos query', async ({ page }) => {
    const loginRes = await api.post('/api/auth/login', {
      data: { email: 'vecino2@elite.com', password: 'password1', source: 'home-assistant' },
    });
    const { token } = await loginRes.json();

    await api.get('/api/consumos', {
      headers: { Authorization: `Bearer ${token}` },
    });

    await page.goto('/admin/usuarios');
    await expect(page.locator('tbody')).toBeVisible();
    const vecino2Row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await expect(vecino2Row.locator('.text-green-600')).toBeVisible({ timeout: 5000 });
  });

  test('non-admin cannot access /admin', async ({ page }) => {
    await loginAsVecino(page);
    await page.goto('/admin/vecinos');
    await expect(page).toHaveURL('/inicio');
  });
});
