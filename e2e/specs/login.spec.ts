import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVecino, logout } from '../fixtures/auth';

test.describe('Login', () => {
  test('admin login redirects to /admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administracion');
  });

  test('vecino login redirects to /dashboard', async ({ page }) => {
    await loginAsVecino(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Elite Dashboard');
  });

  test('wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@elite.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-100')).toContainText('Credenciales invalidas');
  });

  test('empty fields shows error', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      document.querySelectorAll('input').forEach(el => el.removeAttribute('required'));
    });
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-100')).toContainText('Email y password son requeridos');
  });

  test('logout returns to login', async ({ page }) => {
    await loginAsVecino(page);
    await logout(page);
    await expect(page).toHaveURL('/login');
  });
});
