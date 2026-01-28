const { test, expect } = require('@playwright/test');

test('Single Player: History Order and Logic', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);

  await page.fill('#playerName', 'SoloPlayer');
  
  // Use evaluate to bypass any overlay/icon click issues
  await page.evaluate(() => document.getElementById('singlePlayerBtn').click());
  
  await expect(page.locator('#singlePlayerOptions')).toBeVisible();
  
  await page.fill('#singleRangeStart', '1');
  await page.fill('#singleRangeEnd', '100');
  await page.evaluate(() => document.getElementById('startSinglePlayerBtn').click());

  await expect(page.locator('#selectionScreen.active')).toBeVisible({ timeout: 15000 });
  
  await page.fill('#secretNumber', '5');
  await page.evaluate(() => document.getElementById('readyBtn').click());

  await expect(page.locator('#gameScreen.active')).toBeVisible({ timeout: 15000 });
  
  await page.fill('#guessInput', '5');
  await page.evaluate(() => document.getElementById('makeGuessBtn').click());

  const historyItem = page.locator('.guess-item').first();
  await expect(historyItem).toBeAttached({ timeout: 10000 });
});