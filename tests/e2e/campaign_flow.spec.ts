import { test, expect } from '@playwright/test';

test('campaign prompt to approval flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('textarea', 'Create 3 day campaign for Instagram and LinkedIn');
  await page.click('button:has-text("Generate Plan")');
  await expect(page.locator('text=Campaign Plan')).toBeVisible();
  await page.goto('http://localhost:3000/content');
  await expect(page.locator('table')).toBeVisible();
});
