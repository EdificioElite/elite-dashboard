import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin|aerotermia|inicio)/);
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, 'admin@elite.com', 'admin123');
}

export async function loginAsVecino(page: Page) {
  await loginAs(page, 'vecino1@elite.com', 'password1');
}

export async function logout(page: Page) {
  await page.click('button.rounded-full');
  await page.click('text=Salir');
  await page.waitForURL('/login');
}
