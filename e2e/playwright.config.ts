import { defineConfig } from '@playwright/test';

const STATEFUL = /(forgot-password|password-change|directiva|admin-stateful)\.spec\.ts$/;

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'readonly',
      testIgnore: STATEFUL,
    },
    {
      name: 'stateful',
      testMatch: STATEFUL,
    },
  ],
});
