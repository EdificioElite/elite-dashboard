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
    await expect(page.locator('tbody').getByText('Directiva', { exact: true })).toBeVisible();
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
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('ve el dropdown de rol en cada usuario', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/usuarios');

    const row = page.locator('tr', { hasText: 'vecino1@elite.com' });
    const select = row.locator('select');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('usuario');
    await expect(select.locator('option')).toHaveText(['Usuario', 'Directiva', 'Admin']);
  });

  test('cambia el rol de un usuario via API', async () => {
    const adminLogin = await api.post('/api/auth/login', {
      data: { email: 'admin@elite.com', password: 'admin123' },
    });
    const { token } = await adminLogin.json();

    const usersRes = await api.get('/api/admin/usuarios', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = await usersRes.json();
    const vecino1 = users.find((u: any) => u.email === 'vecino1@elite.com');
    expect(vecino1).toBeDefined();

    const updateRes = await api.put(`/api/admin/usuarios/${vecino1.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'directiva' },
    });
    expect(updateRes.status()).toBe(200);
    expect((await updateRes.json()).role).toBe('directiva');

    const restoreRes = await api.put(`/api/admin/usuarios/${vecino1.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'usuario' },
    });
    expect(restoreRes.status()).toBe(200);
    expect((await restoreRes.json()).role).toBe('usuario');
  });
});
