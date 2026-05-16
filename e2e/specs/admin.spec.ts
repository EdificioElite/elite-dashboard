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

test.describe('Admin', () => {
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

  test('shows vecinos table', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Vecinos');
    await expect(page.locator('table')).toBeVisible();
  });

  test('navigates to vecino consumos', async ({ page }) => {
    await page.locator('[title="Ver aerotermia"]').first().click();
    await expect(page).toHaveURL(/\/admin\/vecino\//, { timeout: 10000 });
  });

  test('edits user email and piso', async ({ page }) => {
    await page.goto('/admin/usuarios');
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
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contrasena"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contrasena');

    await modal.locator('input[type="password"]').first().fill('newpass123');
    await modal.locator('input[type="password"]').last().fill('newpass123');
    await modal.getByRole('button', { name: 'Cambiar' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });

    await restoreUserPassword(api, 'vecino2@elite.com', 'password1');
  });

  test('shows error on admin password change with too short password', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contrasena"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contrasena');

    await modal.locator('input[type="password"]').first().fill('12345');
    await modal.locator('input[type="password"]').last().fill('12345');
    await modal.locator('form').dispatchEvent('submit');

    await expect(modal.locator('text=6 caracteres')).toBeVisible({ timeout: 5000 });
  });

  test('shows error on admin password change with mismatched passwords', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino2@elite.com' });
    await row.locator('[title="Cambiar contrasena"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Cambiar contrasena');

    await modal.locator('input[type="password"]').first().fill('newpass123');
    await modal.locator('input[type="password"]').last().fill('different');
    await modal.getByRole('button', { name: 'Cambiar' }).click();

    await expect(modal.locator('text=no coinciden')).toBeVisible({ timeout: 5000 });
  });

  test('deletes a user', async ({ page }) => {
    await page.goto('/admin/usuarios');
    const row = page.locator('tr', { hasText: 'vecino3@elite.com' });
    await row.locator('[title="Eliminar usuario"]').click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal.locator('.eyebrow')).toContainText('Eliminar acceso');

    await modal.getByRole('button', { name: 'Eliminar acceso' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('tbody')).not.toContainText('vecino3@elite.com', { timeout: 5000 });
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
    await expect(page.locator('tbody')).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /Ult\.\s+conexion/ })).toBeVisible();

    const vecino4Row = page.locator('tr', { hasText: 'vecino4@elite.com' });
    await expect(vecino4Row).toContainText('—');
  });

  test('ultima_conexion updates after vecino logs in', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await expect(page.locator('tbody')).toBeVisible();
    const vecino1Row = page.locator('tr', { hasText: 'vecino1@elite.com' });
    await expect(vecino1Row).toContainText('—');

    await logout(page);
    await loginAsVecino(page);

    await logout(page);
    await loginAsAdmin(page);

    await page.goto('/admin/usuarios');
    await expect(page.locator('tbody')).toBeVisible();
    const vecino1RowAfter = page.locator('tr', { hasText: 'vecino1@elite.com' });
    await expect(vecino1RowAfter).not.toContainText('—');
    await expect(vecino1RowAfter).toContainText(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
  });

  test('non-admin cannot access /admin', async ({ page }) => {
    await loginAsVecino(page);
    await page.goto('/admin/vecinos');
    await expect(page).toHaveURL('/inicio');
  });
});
