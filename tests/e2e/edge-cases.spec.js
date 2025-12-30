const { test, expect } = require('@playwright/test');

test('Validation: Invalid inputs', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // 1. Name validation
  await page.fill('#playerName', 'A');
  await page.click('#singlePlayerBtn');
  await page.click('#startSinglePlayerBtn');
  
  await expect(page.locator('.notification.error')).toContainText(/at least 2/i);
});

test('Validation: Out-of-bounds', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // 2. Play valid start
  await page.fill('#playerName', 'ValidTester');
  await page.click('#singlePlayerBtn');
  await page.click('#startSinglePlayerBtn');
  
  await page.waitForSelector('#selectionScreen.active', { state: 'visible' });

  await page.fill('#secretNumber', '5');
  await page.click('#readyBtn', { force: true });

  await page.waitForSelector('#gameScreen.active', { state: 'visible' });

  // 3. Out of bounds guess
  await page.fill('#guessInput', '999');
  await page.click('#makeGuessBtn', { force: true });
  
  await expect(page.locator('.notification.error').last()).toContainText(/between/i);
});

test('Multiplayer: Host Abandonment', async ({ browser }) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();

  await host.goto('/');
  await guest.goto('/');

  await host.fill('#playerName', 'HostUser');
  await host.click('#multiplayerBtn');
  await host.click('#createPartyBtn');
  
  await host.waitForSelector('#lobbyPartyCode:not(:empty)');
  const code = (await host.textContent('#lobbyPartyCode')).trim();

  await guest.fill('#playerName', 'GuestUser');
  await guest.click('#multiplayerBtn');
  await guest.click('#joinPartyBtn');
  await guest.fill('#partyCodeInput', code);
  await guest.click('#joinPartySubmitBtn');

  await host.waitForSelector('#player2Name:has-text("GuestUser")');

  await host.click('#leaveLobbyBtn');
  await host.click('.confirm-yes');

  const guestNotification = guest.locator('.notification.warning').last();
  await expect(guestNotification).toBeVisible({ timeout: 10000 });
  await expect(guest.locator('#welcomeScreen')).toBeVisible();
});
