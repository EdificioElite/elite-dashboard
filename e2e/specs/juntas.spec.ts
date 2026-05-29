import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginAsAdmin, loginAsVecino } from '../fixtures/auth';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function getAdminToken(): Promise<string> {
  const api = await request.newContext({ baseURL: API_BASE });
  const loginRes = await api.post('/api/auth/login', {
    data: { email: 'admin@elite.com', password: 'admin123' },
  });
  const { token } = await loginRes.json();
  await api.dispose();
  return token;
}

async function seedJunta(token: string) {
  const api = await request.newContext({ baseURL: API_BASE });
  const res = await api.post('/api/admin/juntas', {
    headers: { Authorization: `Bearer ${token}` },
    data: { tipo: 'vecinal_ordinaria', fecha: '2026-05-29' },
  });
  const junta = await res.json();
  await api.dispose();
  return junta;
}

async function cleanupJuntas(token: string) {
  const api = await request.newContext({ baseURL: API_BASE });
  const listRes = await api.get('/api/juntas', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const juntas = await listRes.json();
  for (const junta of juntas) {
    await api.delete(`/api/admin/juntas/${junta.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  await api.dispose();
}

test.describe('Juntas', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await getAdminToken();
  });

  test.afterAll(async () => {
    await cleanupJuntas(token);
  });

  test.describe('Vecino', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsVecino(page);
      await page.goto('/juntas');
      await page.waitForSelector('text=Juntas', { timeout: 10000 });
    });

    test('shows both tables even when empty', async ({ page }) => {
      await expect(page.getByText('Vecinales — Juntas Generales')).toBeVisible();
      await expect(page.getByText('Vocales — Juntas de Junta Directiva')).toBeVisible();
    });

    test('does not show crear junta button', async ({ page }) => {
      await expect(page.getByText('Crear junta')).not.toBeVisible();
    });
  });

  test.describe('Admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/juntas');
      await page.waitForSelector('text=Juntas', { timeout: 10000 });
    });

    test('shows crear junta button', async ({ page }) => {
      await expect(page.getByText('Crear junta')).toBeVisible();
    });

    test('can create a junta without PDF', async ({ page }) => {
      await page.getByText('Crear junta').click();
      await expect(page.getByText('Crear junta').first()).toBeVisible();

      await page.fill('input[type="date"]', '2026-06-15');
      await page.click('button:has-text("Guardar")');

      await expect(page.getByText('Junta creada correctamente')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('15 de junio de 2026')).toBeVisible({ timeout: 10000 });
    });

    test('can edit a junta', async ({ page }) => {
      // seed a junta first
      const api = await request.newContext({ baseURL: API_BASE });
      const res = await api.post('/api/admin/juntas', {
        headers: { Authorization: `Bearer ${token}` },
        data: { tipo: 'vecinal_extraordinaria', fecha: '2026-07-01' },
      });
      const junta = await res.json();
      await api.dispose();

      await page.reload();
      await page.waitForSelector('text=Juntas', { timeout: 10000 });

      await page.locator('button[title="Editar junta"]').first().click();
      await expect(page.getByText('Editar junta').first()).toBeVisible();

      await page.selectOption('select', 'vocal_ordinaria');
      await page.fill('input[type="date"]', '2026-07-15');
      await page.click('button:has-text("Guardar")');

      await expect(page.getByText('Junta actualizada correctamente')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('15 de julio de 2026')).toBeVisible({ timeout: 10000 });
    });

    test('can delete a junta', async ({ page }) => {
      // seed a junta first
      const api = await request.newContext({ baseURL: API_BASE });
      const res = await api.post('/api/admin/juntas', {
        headers: { Authorization: `Bearer ${token}` },
        data: { tipo: 'vocal_ordinaria', fecha: '2026-08-01' },
      });
      const junta = await res.json();
      await api.dispose();

      await page.reload();
      await page.waitForSelector('text=Juntas', { timeout: 10000 });

      await page.locator('button[title="Eliminar junta"]').first().click();
      await expect(page.getByText('Eliminar junta')).toBeVisible();
      await expect(page.getByText('Estas seguro de que quieres eliminar esta junta?')).toBeVisible();

      await page.click('button:has-text("Eliminar")');
      await expect(page.getByText('1 de agosto de 2026')).not.toBeVisible({ timeout: 10000 });
    });

    test('delete modal can be cancelled', async ({ page }) => {
      // seed a junta first
      const api = await request.newContext({ baseURL: API_BASE });
      const res = await api.post('/api/admin/juntas', {
        headers: { Authorization: `Bearer ${token}` },
        data: { tipo: 'vocal_extraordinaria', fecha: '2026-09-01' },
      });
      await res.json();
      await api.dispose();

      await page.reload();
      await page.waitForSelector('text=Juntas', { timeout: 10000 });

      await page.locator('button[title="Eliminar junta"]').first().click();
      await page.click('button:has-text("Cancelar")');
      await expect(page.getByText('Eliminar junta')).not.toBeVisible();
    });
  });
});
