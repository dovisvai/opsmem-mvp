import { test, expect } from '@playwright/test';

test('landing page loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/OpsMem/);
  await expect(page.locator('text=DECISION MEMORY')).toBeVisible();
});

test('unauthenticated dashboard prompts user to login', async ({ page }) => {
  await page.goto('/dashboard');
  // Should redirect to home with error parameter
  await expect(page).toHaveURL(/.*unauthorized/);
});
