import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

const TEST_EMAIL = 'vecino1@elite.com';
const OLD_PASSWORD = 'password1';
const NEW_PASSWORD = 'NewPass1';
const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function restorePassword(api: APIRequestContext, email: string, password: string) {
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

test.describe('Password Change (self-service)', () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test.afterEach(async () => {
    await restorePassword(api, TEST_EMAIL, OLD_PASSWORD);
  });

  test('vecino changes own password from header dropdown', async ({ page }) => {
    await loginAs(page, TEST_EMAIL, OLD_PASSWORD);
    await page.waitForSelector('text=Cargando tus datos', { state: 'hidden', timeout: 10000 }).catch(() => {});

    await page.locator('.rounded-full').click();
    await page.getByText('Cambiar contrasena').click();

    const modal = page.locator('[role="dialog"]').last();
    await expect(modal.getByText('Cambiar contrasena')).toBeVisible();

    await modal.getByLabel('Contrasena actual').fill(OLD_PASSWORD);
    await modal.getByLabel('Nueva contrasena').fill(NEW_PASSWORD);
    await modal.getByLabel('Confirmar contrasena').fill(NEW_PASSWORD);

    await modal.getByRole('button', { name: /Cambiar/i }).click();

    await expect(modal.getByText(/actualizada correctamente/)).toBeVisible({ timeout: 5000 });
  });

  test('shows error with wrong current password', async ({ page }) => {
    await loginAs(page, TEST_EMAIL, OLD_PASSWORD);

    await page.locator('.rounded-full').click();
    await page.getByText('Cambiar contrasena').click();

    const modal = page.locator('[role="dialog"]').last();
    await modal.getByLabel('Contrasena actual').fill('wrongpassword');
    await modal.getByLabel('Nueva contrasena').fill(NEW_PASSWORD);
    await modal.getByLabel('Confirmar contrasena').fill(NEW_PASSWORD);

    await modal.getByRole('button', { name: /Cambiar/i }).click();

    await expect(modal.getByText(/incorrecta/)).toBeVisible({ timeout: 5000 });
  });

  test('shows error with weak password (too short)', async ({ page }) => {
    await loginAs(page, TEST_EMAIL, OLD_PASSWORD);

    await page.locator('.rounded-full').click();
    await page.getByText('Cambiar contrasena').click();

    const modal = page.locator('[role="dialog"]').last();
    await modal.getByLabel('Contrasena actual').fill(OLD_PASSWORD);
    await modal.getByLabel('Nueva contrasena').fill('Ab1');
    await modal.getByLabel('Confirmar contrasena').fill('Ab1');

    await modal.getByRole('button', { name: /Cambiar/i }).click();

    await expect(modal.getByText(/8 caracteres/)).toBeVisible({ timeout: 5000 });
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await loginAs(page, TEST_EMAIL, OLD_PASSWORD);

    await page.locator('.rounded-full').click();
    await page.getByText('Cambiar contrasena').click();

    const modal = page.locator('[role="dialog"]').last();
    await modal.getByLabel('Contrasena actual').fill(OLD_PASSWORD);
    await modal.getByLabel('Nueva contrasena').fill(NEW_PASSWORD);
    await modal.getByLabel('Confirmar contrasena').fill('Different1');

    await modal.getByRole('button', { name: /Cambiar/i }).click();

    await expect(modal.getByText(/no coinciden/)).toBeVisible({ timeout: 5000 });
  });
});
