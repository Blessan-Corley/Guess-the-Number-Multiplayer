const defaultMessages = {
  TOO_HIGH: 'Too high! Try a lower number.',
  TOO_LOW: 'Too low! Try a higher number.',
  CLOSE_HIGH: 'Close, but still too high!',
  CLOSE_LOW: 'Close, but still too low!',
  VERY_CLOSE_HIGH: 'Very close! Just a bit lower!',
  VERY_CLOSE_LOW: 'Very close! Just a bit higher!',
};

const contextualMessages = {
  gameStart: [
    'Let the games begin!',
    'Ready, set, guess!',
    'May the best guesser win!',
    'Time to show your skills!',
    'Game on!',
  ],
  roundStart: [
    'New round, new challenge!',
    'Here we go again!',
    'Round {round} begins!',
    'Fresh start, fresh chances!',
    "Let's see what you've got!",
  ],
  playerJoin: [
    'Welcome to the party!',
    'A new challenger appears!',
    'Great to have you here!',
    "Let's play together!",
    'Ready for some fun?',
  ],
  playerLeave: [
    'Thanks for playing!',
    'See you next time!',
    'Come back soon!',
    'It was fun while it lasted!',
    'Until we meet again!',
  ],
  gameWin: [
    'Congratulations, champion!',
    'Victory is yours!',
    'What a performance!',
    'Absolutely brilliant!',
    'You are the winner!',
  ],
  gameLose: [
    'Great effort! Try again!',
    'You played well!',
    'Better luck next time!',
    'Keep practicing!',
    "You'll get it next round!",
  ],
  rematch: [
    "Round two, let's go!",
    'The rematch begins!',
    'Another chance at glory!',
    'Redemption time!',
    'Prove yourself again!',
  ],
  timeout: [
    "Time's up! Auto-selecting...",
    'No more time to think!',
    'Decision time is over!',
    'Time limit reached!',
    'Making choice for you!',
  ],
};

const celebrationMessages = {
  normal: [
    'Fantastic! You found it!',
    'Brilliant guessing!',
    'Victory is yours!',
    'Amazing work!',
    'Bullseye! Perfect!',
  ],
  quick: [
    'Lightning fast!',
    'Speed demon!',
    'Quick as a flash!',
    'Speedy victory!',
    'Record time!',
  ],
  comeback: [
    'Incredible comeback!',
    'Never gave up!',
    'What a turnaround!',
    'Against all odds!',
    'Clutch performance!',
  ],
  perfect: [
    'Mind reader confirmed!',
    'One guess wonder!',
    'Supernatural skills!',
    'Absolute legend!',
    'Perfection achieved!',
  ],
};

const trashTalkMessages = [
  'Feeling confident, are we?',
  "Let's see what you've got!",
  'Bring your A-game!',
  'Time to prove yourself!',
  'Show me your skills!',
  'Think you can beat me?',
  'Ready for a challenge?',
  'Let the best player win!',
];

const waitingMessages = {
  general: [
    'Waiting for other players...',
    "Hang tight, we're almost ready!",
    'Just a moment more...',
    'Getting everything set up...',
    'Patience, young grasshopper...',
  ],
  opponent: [
    'Your opponent is thinking...',
    'Waiting for their move...',
    "They're strategizing...",
    'Taking their time...',
    'Planning their next guess...',
  ],
  selection: [
    'Choose your secret number!',
    'Pick wisely!',
    'Time is ticking...',
    'Make your selection!',
    "What's your choice?",
  ],
};

const errorMessages = {
  invalidGuess: [
    "That doesn't look right!",
    'Please enter a valid number!',
    'Stay within the range!',
    'Check your input!',
    'Try again with a valid guess!',
  ],
  notYourTurn: [
    "Hold on, it's not your turn yet!",
    'Patience! Wait for your chance!',
    'Your opponent is still playing!',
    'Wait for the green light!',
    'Just a moment more!',
  ],
  connectionError: [
    'Connection hiccup! Trying again...',
    'Reconnecting to the game...',
    'Network issue detected!',
    'Checking your connection...',
    'Technical difficulties!',
  ],
  partyFull: [
    'This party is already full!',
    'Maximum players reached!',
    'Sorry, no more room!',
    'Try creating a new party!',
    'Look for another game!',
  ],
};

module.exports = {
  defaultMessages,
  contextualMessages,
  celebrationMessages,
  trashTalkMessages,
  waitingMessages,
  errorMessages,
};
