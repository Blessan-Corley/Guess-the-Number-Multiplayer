const { test, expect } = require('@playwright/test');

test('Multiplayer: Full Match + Rematch Flow', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await guest.goto('/');

  // 1. Setup
  await host.fill('#playerName', 'TheHost');
  // Use more specific selectors for buttons with icons
  await host.locator('button#multiplayerBtn').click();
  await expect(host.locator('#multiplayerOptions')).toBeVisible();
  await host.locator('button#createPartyBtn').click();

  await host.waitForSelector('#lobbyPartyCode:not(:empty)');
  const code = (await host.textContent('#lobbyPartyCode')).trim();

  await guest.fill('#playerName', 'TheGuest');
  await guest.locator('button#multiplayerBtn').click();
  await expect(guest.locator('#multiplayerOptions')).toBeVisible();
  await guest.locator('button#joinPartyBtn').click();
  await expect(guest.locator('#joinPartyDiv')).toBeVisible();
  await guest.fill('#partyCodeInput', code);
  await guest.locator('button#joinPartySubmitBtn').click();

  // Wait for both to be in lobby
  await host.waitForSelector('#player2Name:has-text("TheGuest")');

  // 2. Start
  await host.locator('button#startGameBtn').click({ force: true });

  // Wait for selection screen
  await expect(host.locator('#selectionScreen')).toBeVisible({ timeout: 15000 });
  await expect(guest.locator('#selectionScreen')).toBeVisible({ timeout: 15000 });
  await expect(guest.locator('#selectionScreen')).toBeVisible();

  await host.fill('#secretNumber', '10');
  await host.waitForTimeout(1000);
  await host.locator('button#readyBtn').click({ force: true });
  await guest.fill('#secretNumber', '20');
  await guest.waitForTimeout(1000);
  await guest.locator('button#readyBtn').click({ force: true });

  // 3. Play & Win
  await expect(host.locator('#gameScreen')).toBeVisible({ timeout: 15000 });
  await expect(guest.locator('#gameScreen')).toBeVisible({ timeout: 15000 });

  await guest.fill('#guessInput', '10');
  await guest.locator('button#makeGuessBtn').click({ force: true });
  await expect(guest.locator('button#makeGuessBtn')).toContainText('Waiting', { timeout: 15000 });
  await expect(host.locator('#opponentAttempts')).toHaveText('1', { timeout: 15000 });

  await host.fill('#guessInput', '50');
  await host.locator('button#makeGuessBtn').click({ force: true });
  await expect(host.locator('#myAttempts')).toHaveText('1', { timeout: 15000 });

  await expect(host.locator('#resultsScreen')).toBeVisible({ timeout: 15000 });
  await expect(guest.locator('#resultsScreen')).toBeVisible({ timeout: 15000 });

  // 4. Test Rematch Flow
  await guest.locator('button:has-text("Rematch")').click({ force: true });
  await host.locator('button:has-text("Rematch")').click({ force: true });

  // Should be back in selection
  await expect(host.locator('#selectionScreen')).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test('Multiplayer: Public room listing updates in realtime and supports joining from the setup panel', async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await guest.goto('/');

  await host.fill('#playerName', 'HostPublic');
  await host.locator('button#multiplayerBtn').click();
  await host.locator('button#createPartyBtn').click();
  await host.waitForSelector('#lobbyPartyCode:not(:empty)');
  const publicPartyCode = (await host.textContent('#lobbyPartyCode')).trim();
  await host.locator('#partyVisibilityToggle').click();

  await guest.fill('#playerName', 'GuestPublic');
  await guest.locator('button#multiplayerBtn').click();
  await expect(guest.locator('#multiplayerOptions')).toBeVisible();
  const publicRoom = guest.locator(`[data-public-party-code="${publicPartyCode}"]`);
  await expect(publicRoom).toContainText('HostPublic');
  await expect(publicRoom).toContainText('1/2');

  await publicRoom.locator('[data-public-party-join]').click();

  await host.waitForSelector('#player2Name:has-text("GuestPublic")');
  await expect(guest.locator('#lobbyScreen')).toBeVisible();
  await expect(guest.locator('#lobbyPartyCode')).not.toBeEmpty();

  await hostContext.close();
  await guestContext.close();
});
