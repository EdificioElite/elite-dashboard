import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginAsAdmin, loginAsDirectiva, loginAsVecino } from '../fixtures/auth';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

test.describe('Directiva (admin solo lectura)', () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('accede a los paneles de admin', async ({ page }) => {
    await loginAsDirectiva(page);

    await page.goto('/admin/vecinos');
    await expect(page.locator('h1')).toContainText('Vecinos');
    await expect(page.locator('table')).toBeVisible();

    await page.goto('/admin/usuarios');
    await expect(page.locator('h1')).toContainText('Usuarios');
    await expect(page.locator('table')).toBeVisible();

    await page.goto('/admin/aerotermia');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('ve "Ver aerotermia" pero no botones de edicion en vecinos', async ({ page }) => {
    await loginAsDirectiva(page);
    await page.goto('/admin/vecinos');

    await expect(page.locator('[title="Ver aerotermia"]').first()).toBeVisible();
    await expect(page.locator('[title="Editar vecino"]')).toHaveCount(0);
    await expect(page.locator('[title="Eliminar vecino"]')).toHaveCount(0);
    await expect(page.locator('[title="Enviar invitación"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Añadir vecino' })).toHaveCount(0);
  });

  test('ve badges de rol pero sin dropdown ni acciones en usuarios', async ({ page }) => {
    await loginAsDirectiva(page);
    await page.goto('/admin/usuarios');

    await expect(page.locator('table tbody')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear acceso' })).toHaveCount(0);
    await expect(page.locator('[title="Editar usuario"]')).toHaveCount(0);
    await expect(page.locator('[title="Eliminar usuario"]')).toHaveCount(0);
    await expect(page.locator('[title="Cambiar contraseña"]')).toHaveCount(0);

    await expect(page.locator('tbody select')).toHaveCount(0);
    await expect(page.locator('tbody').getByText('Directiva')).toBeVisible();
  });

  test('no puede escribir via API (403)', async () => {
    const loginRes = await api.post('/api/auth/login', {
      data: { email: 'directiva@elite.com', password: 'directiva123' },
    });
    const { token } = await loginRes.json();

    const res = await api.post('/api/admin/usuarios', {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: 'nobody@elite.com' },
    });
    expect(res.status()).toBe(403);
  });

  test('puede hacer cross-view de otro piso', async () => {
    const loginRes = await api.post('/api/auth/login', {
      data: { email: 'directiva@elite.com', password: 'directiva123' },
    });
    const { token } = await loginRes.json();

    const res = await api.get('/api/facturas?piso=2A', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('usuario normal sigue sin poder acceder a /admin', async ({ page }) => {
    await loginAsVecino(page);
    await page.goto('/admin/vecinos');
    await expect(page).toHaveURL('/inicio');
  });
});

test.describe('Admin gestiona roles', () => {
  test('cambia el rol de un usuario a directiva con el dropdown', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/usuarios');

    const row = page.locator('tr', { hasText: 'vecino4@elite.com' });
    await row.locator('select').selectOption('directiva');
    await expect(row.locator('select')).toHaveValue('directiva', { timeout: 5000 });

    await row.locator('select').selectOption('usuario');
    await expect(row.locator('select')).toHaveValue('usuario', { timeout: 5000 });
  });
});
