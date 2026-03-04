const UIGuides = {
  getGuide(mode = 'multiplayer') {
    if (mode === 'singleplayer') {
      return this.getSinglePlayerGuide();
    }

    if (mode === 'general') {
      return this.getGeneralGuide();
    }

    return this.getMultiplayerGuide();
  },

  getMultiplayerGuide() {
    return `
            <h3>Multiplayer Mode</h3>
            <p>Challenge another player in a shared real-time match.</p>

            <h4>Getting Started</h4>
            <ol>
                <li><strong>Create Party:</strong> The host generates a six-character party code.</li>
                <li><strong>Join Party:</strong> The second player enters the code to join.</li>
                <li><strong>Adjust Settings:</strong> The host can change the number range before the game starts.</li>
                <li><strong>Start Match:</strong> The host starts the game when both players are ready.</li>
            </ol>

            <h4>Round Flow</h4>
            <ol>
                <li><strong>Choose a Secret Number:</strong> Each player picks a hidden number inside the selected range.</li>
                <li><strong>Take Turns Guessing:</strong> Players try to find the opponent's number.</li>
                <li><strong>Use the Feedback:</strong> Each guess returns directional and distance hints.</li>
                <li><strong>Win the Round:</strong> The player with the better result wins the round.</li>
            </ol>

            <h4>After the Round</h4>
            <ul>
                <li><strong>Rematch:</strong> Start another round with the same players.</li>
                <li><strong>Change Settings:</strong> Return to the lobby and adjust the range.</li>
                <li><strong>Track Results:</strong> Finished multiplayer matches update the player record and leaderboard.</li>
            </ul>
        `;
  },

  getSinglePlayerGuide() {
    return `
            <h3>Single Player Mode</h3>
            <p>Play against the built-in bot and practice your guessing strategy.</p>

            <h4>Setup</h4>
            <ol>
                <li><strong>Choose a Range:</strong> Set the minimum and maximum numbers.</li>
                <li><strong>Pick a Difficulty:</strong> Select Easy, Medium, or Hard.</li>
                <li><strong>Start the Match:</strong> Choose your secret number and begin.</li>
            </ol>

            <h4>How It Works</h4>
            <ol>
                <li><strong>Both Sides Pick a Secret Number:</strong> You choose one number and the bot chooses another.</li>
                <li><strong>Alternate Guesses:</strong> You and the bot take turns guessing.</li>
                <li><strong>Read the Feedback:</strong> Use the hint messages to narrow the search.</li>
                <li><strong>Finish Faster:</strong> Fewer attempts lead to a stronger result.</li>
            </ol>

            <h4>Difficulty Levels</h4>
            <ul>
                <li><strong>Easy:</strong> The bot plays with a weaker strategy.</li>
                <li><strong>Medium:</strong> The bot balances speed and consistency.</li>
                <li><strong>Hard:</strong> The bot guesses efficiently and punishes mistakes.</li>
            </ul>
        `;
  },

  getGeneralGuide() {
    return `
            <h3>How the Game Works</h3>
            <p>Choose between multiplayer competition and single-player practice.</p>

            <h4>Multiplayer</h4>
            <ul>
                <li>Create or join a party with a six-character code.</li>
                <li>Both players choose a secret number and guess against each other.</li>
                <li>Finished matches update the player record and leaderboard.</li>
            </ul>

            <h4>Single Player</h4>
            <ul>
                <li>Play against the built-in bot.</li>
                <li>Choose a custom range and difficulty level.</li>
                <li>Use the mode to practice before multiplayer matches.</li>
            </ul>

            <h4>Core Rules</h4>
            <ul>
                <li>Every secret number must stay inside the selected range.</li>
                <li>Feedback helps narrow the search after each guess.</li>
                <li>Strong performance comes from efficient guessing, not random attempts.</li>
            </ul>
        `;
  },
};

window.UIGuides = UIGuides;
