import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVecino, logout } from '../fixtures/auth';

test.describe('Login', () => {
  test('admin login redirects to /admin/vecinos', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin\/vecinos/);
    await expect(page.locator('h1')).toContainText('Vecinos');
  });

  test('vecino login redirects to /aerotermia', async ({ page }) => {
    await loginAsVecino(page);
    await expect(page).toHaveURL('/aerotermia');
    await expect(page.getByText('Aerotermia')).toBeVisible();
  });

  test('wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@elite.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
  });

  test('empty fields shows error', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      document.querySelectorAll('input').forEach(el => el.removeAttribute('required'));
    });
    await page.click('button[type="submit"]');
    await expect(page.getByText('Email y password son requeridos')).toBeVisible();
  });

  test('logout returns to login', async ({ page }) => {
    await loginAsVecino(page);
    await logout(page);
    await expect(page).toHaveURL('/login');
  });
});
