import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ruimtemeesters/);
  });

  test('unauthenticated users see workspace login prompt', async ({ page }) => {
    await page.goto('/');
    // Clerk will render signed-out state — user should see the workspace redirect
    await expect(page.getByText('Je bent niet ingelogd.')).toBeVisible({ timeout: 15000 });
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('themes API requires authentication', async ({ request }) => {
    const response = await request.get('/api/themes');
    expect(response.status()).toBe(401);
  });

  test('docs endpoint returns API documentation', async ({ request }) => {
    const response = await request.get('/api/docs');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.name).toBe('Ruimtemeesters Dashboard API');
  });
});
