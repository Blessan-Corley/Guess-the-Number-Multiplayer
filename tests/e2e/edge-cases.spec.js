const { test, expect } = require('@playwright/test');

test('Validation: Invalid inputs', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // 1. Name validation
  await page.fill('#playerName', 'A');
  await page.locator('button#singlePlayerBtn').click();
  await expect(page.locator('#singlePlayerOptions')).toBeVisible();
  await page.locator('button#startSinglePlayerBtn').click();
  
  await expect(page.locator('.notification.error')).toContainText(/at least 2/i);
});

test('Validation: Out-of-bounds', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // 2. Play valid start
  await page.fill('#playerName', 'ValidTester');
  await page.locator('button#singlePlayerBtn').click();
  await expect(page.locator('#singlePlayerOptions')).toBeVisible();
  await page.locator('button#startSinglePlayerBtn').click();
  
  await expect(page.locator('#selectionScreen')).toBeVisible({ timeout: 15000 });

  await page.fill('#secretNumber', '5');
  await page.locator('button#readyBtn').click({ force: true });

  await expect(page.locator('#gameScreen')).toBeVisible({ timeout: 15000 });

  // 3. Out of bounds guess
  await page.fill('#guessInput', '999');
  await page.locator('button#makeGuessBtn').click({ force: true });
  
  await expect(page.locator('.notification.error').last()).toContainText(/between/i);
});

test('Multiplayer: Host Abandonment with Custom Modal', async ({ browser }) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();

  await host.goto('/');
  await guest.goto('/');

  await host.fill('#playerName', 'HostUser');
  await host.locator('button#multiplayerBtn').click();
  await expect(host.locator('#multiplayerOptions')).toBeVisible();
  await host.locator('button#createPartyBtn').click();
  
  await host.waitForSelector('#lobbyPartyCode:not(:empty)');
  const code = (await host.textContent('#lobbyPartyCode')).trim();

  await guest.fill('#playerName', 'GuestUser');
  await guest.locator('button#multiplayerBtn').click();
  await expect(guest.locator('#multiplayerOptions')).toBeVisible();
  await guest.locator('button#joinPartyBtn').click();
  await expect(guest.locator('#joinPartyDiv')).toBeVisible();
  await guest.fill('#partyCodeInput', code);
  await guest.locator('button#joinPartySubmitBtn').click();

  await host.waitForSelector('#player2Name:has-text("GuestUser")');

  await host.locator('button#leaveLobbyBtn').click();
  
  await expect(host.locator('.confirm-yes')).toBeVisible();
  await host.locator('button.confirm-yes').click();

  const guestNotification = guest.locator('.notification.warning').last();
  await expect(guestNotification).toBeVisible({ timeout: 10000 });
  await expect(guest.locator('#welcomeScreen')).toBeVisible();
});
