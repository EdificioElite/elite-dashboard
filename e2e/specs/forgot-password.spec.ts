import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function getAdminToken(api: APIRequestContext) {
  const res = await api.post('/api/auth/login', {
    data: { email: 'admin@elite.com', password: 'admin123' },
  });
  const { token } = await res.json();
  return token;
}

async function clearMockEmails(api: APIRequestContext) {
  await api.post('/api/test/emails/clear');
}

async function getMockEmails(api: APIRequestContext): Promise<any[]> {
  const res = await api.get('/api/test/emails');
  const emails = await res.json();
  return emails;
}

async function getLatestMockToken(api: APIRequestContext): Promise<string | null> {
  const emails = await getMockEmails(api);
  if (emails.length === 0) return null;
  return emails[emails.length - 1].token;
}

async function cleanupUser(api: APIRequestContext, adminToken: string, email: string) {
  const usersRes = await api.get('/api/admin/usuarios', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const users = await usersRes.json();
  const user = users.find((u: any) => u.email === email);
  if (user) {
    await api.delete(`/api/admin/usuarios/${user.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }
}

test.describe('Forgot Password Flow', () => {
  let api: APIRequestContext;
  let adminToken: string;
  const TEST_EMAIL = 'vecino1@elite.com';

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_BASE });
    adminToken = await getAdminToken(api);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test.beforeEach(async () => {
    await clearMockEmails(api);
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/login');
    const link = page.getByRole('link', { name: /Olvidaste tu contrasena/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/recuperar-contrasena');
  });

  test('forgot password page shows form and generic success message', async ({ page }) => {
    await page.goto('/recuperar-contrasena');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible();

    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(page.getByText(/recibiras un enlace/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: 'Volver al login' })).toBeVisible();
  });

  test('forgot password page shows generic message for unknown email', async ({ page }) => {
    await page.goto('/recuperar-contrasena');
    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(page.getByText(/recibiras un enlace/i)).toBeVisible({ timeout: 5000 });
  });

  test('reset password page shows error for invalid token', async ({ page }) => {
    await page.goto('/resetear-contrasena?token=invalid-token-12345');
    await expect(page.getByText(/invalido|expirado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: 'Volver al login' })).toBeVisible();
  });

  test('full reset password flow: request reset, set new password, login with new password', async ({ page }) => {
    // Step 1: Request password reset via API
    const forgotRes = await api.post('/api/auth/forgot-password', {
      data: { email: TEST_EMAIL },
    });
    expect(forgotRes.ok()).toBe(true);

    // Step 2: Get the token from mock emails
    const token = await getLatestMockToken(api);
    expect(token).not.toBeNull();

    // Step 3: Navigate to reset password page with token
    await page.goto(`/resetear-contrasena?token=${token}`);
    await expect(page.getByLabel('Nueva contrasena')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Confirmar contrasena')).toBeVisible();

    // Step 4: Set new password
    const newPassword = 'NewPass1';
    await page.getByLabel('Nueva contrasena').fill(newPassword);
    await page.getByLabel('Confirmar contrasena').fill(newPassword);
    await page.getByRole('button', { name: 'Guardar contrasena' }).click();

    // Step 5: Verify success
    await expect(page.getByText(/actualizada correctamente/i)).toBeVisible({ timeout: 5000 });

    // Step 6: Navigate to login
    await page.getByRole('link', { name: 'Ir al login' }).click();
    await page.waitForURL('/login');

    // Step 7: Login with new password
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin|aerotermia|inicio)/, { timeout: 10000 });

    // Cleanup: restore original password
    const usersRes = await api.get('/api/admin/usuarios', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await usersRes.json();
    const user = users.find((u: any) => u.email === TEST_EMAIL);
    if (user) {
      await api.put(`/api/admin/usuarios/${user.id}/password`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { password: 'password1' },
      });
    }
  });

  test('reset password shows error when passwords do not match', async ({ page }) => {
    // Get a valid token
    await api.post('/api/auth/forgot-password', { data: { email: TEST_EMAIL } });
    const token = await getLatestMockToken(api);
    expect(token).not.toBeNull();

    await page.goto(`/resetear-contrasena?token=${token}`);
    await expect(page.getByLabel('Nueva contrasena')).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Nueva contrasena').fill('NewPass1');
    await page.getByLabel('Confirmar contrasena').fill('Different1');
    await page.getByRole('button', { name: 'Guardar contrasena' }).click();

    await expect(page.getByText(/no coinciden/i)).toBeVisible({ timeout: 5000 });
  });

  test('reset password shows error for weak password', async ({ page }) => {
    await api.post('/api/auth/forgot-password', { data: { email: TEST_EMAIL } });
    const token = await getLatestMockToken(api);
    expect(token).not.toBeNull();

    await page.goto(`/resetear-contrasena?token=${token}`);
    await expect(page.getByLabel('Nueva contrasena')).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Nueva contrasena').fill('abcdefgh');
    await page.getByLabel('Confirmar contrasena').fill('abcdefgh');
    await page.getByRole('button', { name: 'Guardar contrasena' }).click();

    await expect(page.getByText(/mayuscula/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Invitation Flow', () => {
  let api: APIRequestContext;
  let adminToken: string;
  const INVITE_PISO = '6A';
  const INVITE_EMAIL = 'vecino6@elite.com';

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_BASE });
    adminToken = await getAdminToken(api);
    await cleanupUser(api, adminToken, INVITE_EMAIL);
    await clearMockEmails(api);
  });

  test.afterAll(async () => {
    await cleanupUser(api, adminToken, INVITE_EMAIL);
    await clearMockEmails(api);
    await api.dispose();
  });

  test.beforeEach(async () => {
    await clearMockEmails(api);
  });

  test('registration page shows error for invalid token', async ({ page }) => {
    await page.goto('/registro?token=invalid-token-12345');
    await expect(page.getByText(/invalido|expirado/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin page shows invite button for vecino without user', async ({ page }) => {
    await loginAsAdmin(page);

    const row = page.locator('tr', { hasText: INVITE_PISO });
    await expect(row).toBeVisible();

    const inviteBtn = row.locator('[title="Enviar invitacion"]');
    await expect(inviteBtn).toBeVisible();
  });

  test('admin can send invitation and sees success message', async ({ page }) => {
    await loginAsAdmin(page);

    const row = page.locator('tr', { hasText: INVITE_PISO });
    const inviteBtn = row.locator('[title="Enviar invitacion"]');
    await inviteBtn.click();

    await expect(page.getByText(/Invitacion enviada correctamente/i)).toBeVisible({ timeout: 5000 });
  });

  test('full invitation and registration flow', async ({ page }) => {
    // Step 1: Clean up any previous registration
    await cleanupUser(api, adminToken, INVITE_EMAIL);
    await clearMockEmails(api);

    // Step 2: Admin sends invitation via API
    const inviteRes = await api.post('/api/admin/invitar', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { piso: INVITE_PISO },
    });
    expect(inviteRes.ok()).toBe(true);

    // Step 3: Get token from mock emails
    const emails = await getMockEmails(api);
    expect(emails.length).toBeGreaterThanOrEqual(1);
    const token = emails[emails.length - 1].token;
    expect(token).toBeTruthy();

    // Step 4: Navigate to registration page with token
    await page.goto(`/registro?token=${token}`);
    await expect(page.getByLabel('Email')).toHaveValue(INVITE_EMAIL, { timeout: 5000 });
    await expect(page.getByLabel('Piso')).toHaveValue(INVITE_PISO);

    // Step 5: Register with password
    await page.locator('#password').fill('RegPass1');
    await page.getByLabel('Confirmar contrasena').fill('RegPass1');
    await page.getByRole('button', { name: 'Registrarse' }).click();

    // Step 6: Verify redirect to inicio
    await page.waitForURL('/inicio', { timeout: 10000 });
    await expect(page.getByText(/Bienvenido/i)).toBeVisible({ timeout: 5000 });

    // Step 7: Logout
    await page.locator('.rounded-full').click();
    await page.getByText('Salir').click();
    await page.waitForURL('/login');

    // Step 8: Login with new account
    await page.fill('input[type="email"]', INVITE_EMAIL);
    await page.fill('input[type="password"]', 'RegPass1');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin|aerotermia|inicio)/, { timeout: 10000 });
  });

  test('registration shows error when passwords do not match', async ({ page }) => {
    await cleanupUser(api, adminToken, INVITE_EMAIL);
    await clearMockEmails(api);

    const inviteRes = await api.post('/api/admin/invitar', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { piso: INVITE_PISO },
    });
    expect(inviteRes.ok()).toBe(true);

    const token = await getLatestMockToken(api);
    expect(token).not.toBeNull();

    await page.goto(`/registro?token=${token}`);
    await expect(page.locator('#password')).toBeVisible({ timeout: 5000 });

    await page.locator('#password').fill('RegPass1');
    await page.getByLabel('Confirmar contrasena').fill('Different1');
    await page.getByRole('button', { name: 'Registrarse' }).click();

    await expect(page.getByText(/no coinciden/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin invite shows error for vecino that already has user', async ({ page }) => {
    await loginAsAdmin(page);

    // 1A has admin user - should NOT have invite button
    const row = page.locator('tr', { hasText: '1A' });
    await expect(row).toBeVisible();

    const inviteBtn = row.locator('[title="Enviar invitacion"]');
    await expect(inviteBtn).not.toBeVisible();
  });
});
