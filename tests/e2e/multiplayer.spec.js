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
  await host.click('#multiplayerBtn');
  await host.click('#createPartyBtn');
  
  await host.waitForSelector('#lobbyPartyCode:not(:empty)');
  const code = (await host.textContent('#lobbyPartyCode')).trim();

  await guest.fill('#playerName', 'TheGuest');
  await guest.click('#multiplayerBtn');
  await guest.click('#joinPartyBtn');
  await guest.fill('#partyCodeInput', code);
  await guest.click('#joinPartySubmitBtn');

  // Wait for both to be in lobby
  await host.waitForSelector('#player2Name:has-text("TheGuest")');

  // 2. Start
  await host.click('#startGameBtn', { force: true });
  
  // Wait for selection screen
  await host.waitForSelector('#selectionScreen.active');
  await guest.waitForSelector('#selectionScreen.active');

  await host.fill('#secretNumber', '10');
  await host.click('#readyBtn', { force: true });
  await guest.fill('#secretNumber', '20');
  await guest.click('#readyBtn', { force: true });

  // 3. Play & Win
  await host.waitForSelector('#gameScreen.active');
  await guest.waitForSelector('#gameScreen.active');

  await guest.fill('#guessInput', '10');
  await guest.click('#makeGuessBtn', { force: true });
  await host.fill('#guessInput', '50');
  await host.click('#makeGuessBtn', { force: true });

  await guest.waitForSelector('#resultsScreen.active');

  // 4. Test Rematch Flow
  await guest.click('button:has-text("Rematch")', { force: true });
  await host.click('button:has-text("Rematch")', { force: true });

  // Should be back in selection
  await host.waitForSelector('#selectionScreen.active');
  
  await hostContext.close();
  await guestContext.close();
});