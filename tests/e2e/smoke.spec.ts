import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ruimtemeesters/);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Inloggen')).toBeVisible();
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('themes API returns data', async ({ request }) => {
    const response = await request.get('/api/themes');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.themes).toBeDefined();
  });

  test('docs endpoint returns API documentation', async ({ request }) => {
    const response = await request.get('/api/docs');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.name).toBe('Ruimtemeesters Dashboard API');
  });
});
