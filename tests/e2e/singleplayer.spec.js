const { test, expect } = require('@playwright/test');

test('Single Player: AI Bot Match', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);

  // 1. Setup
  await page.fill('#playerName', 'SoloPlayer');
  await page.click('#singlePlayerBtn');
  await page.selectOption('#botDifficulty', 'medium');
  await page.fill('#singleRangeStart', '1');
  await page.fill('#singleRangeEnd', '10');
  
  await page.click('#startSinglePlayerBtn');

  // 2. Selection Phase
  await page.waitForSelector('#selectionScreen.active', { state: 'visible', timeout: 15000 });
  
  await page.fill('#secretNumber', '5');
  await page.click('#readyBtn', { force: true });

  // 3. Gameplay Phase
  await page.waitForSelector('#gameScreen.active', { state: 'visible', timeout: 15000 });
  
  // Make a guess
  await page.fill('#guessInput', '5');
  await page.click('#makeGuessBtn', { force: true });

  // History should update (check presence)
  const historyItem = page.locator('.guess-item').first();
  await expect(historyItem).toBeAttached({ timeout: 10000 });
});
