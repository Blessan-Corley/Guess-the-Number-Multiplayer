# 🎯 Multiplayer Number Guesser

A real-time multiplayer number guessing game built with Node.js, Socket.IO, and modern web technologies. Challenge your friends in exciting number guessing battles!

## ✨ Features

### 🎮 Real-time Multiplayer
- **Instant synchronization** across all devices
- **WebSocket-based** communication for zero-lag gameplay
- **Automatic reconnection** handling
- **Multiple simultaneous parties** support

### 🎯 Game Features
- **Party code system** for easy friend invitations
- **Customizable number ranges** (1-1000+ supported)
- **Best of 3 rounds** option for tournament play
- **Smart feedback system** with contextual hints
- **Performance analytics** and achievement tracking
- **Mobile-first responsive design**

### 🛠️ Technical Features
- **Progressive Web App (PWA)** - install on any device
- **Offline-first architecture** with graceful degradation
- **Real-time connection monitoring**
- **Automatic party cleanup** and timeout handling
- **Production-ready scaling** architecture

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Modern web browser with WebSocket support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/multiplayer-number-guesser.git
cd multiplayer-number-guesser

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:3000`

### Production Deployment

```bash
# Install PM2 for production process management
npm install -g pm2

# Start production server
npm run production

# Monitor server status
pm2 status multiplayer-game
pm2 logs multiplayer-game
```

## 🎮 How to Play

### Creating a Party
1. Enter your name
2. Click "Create Party"
3. Share the 6-character party code with your friend
4. Adjust game settings (range, best of 3)
5. Start the game when both players are ready

### Joining a Party
1. Enter your name
2. Click "Join Party"
3. Enter the party code from your friend
4. Wait for the host to start the game

### Playing the Game
1. **Selection Phase** (30 seconds):
   - Choose your secret number within the range
   - Click "Ready" or wait for auto-selection
2. **Battle Phase**:
   - Guess your opponent's secret number
   - Receive smart feedback (too high/low, close/far)
   - First to guess correctly wins the round
3. **Results**:
   - View performance analytics
   - Play next round or rematch

## 🏗️ Project Structure

```
multiplayer-number-guesser/
├── server.js                 # Main server entry point
├── package.json              # Dependencies and scripts
├── config/
│   └── config.js            # Server configuration
├── src/
│   ├── models/              # Game logic models
│   │   ├── Game.js          # Core game mechanics
│   │   ├── Player.js        # Player management
│   │   └── Party.js         # Party/room management
│   ├── services/            # Business logic services
│   │   ├── GameService.js   # Game flow management
│   │   ├── PartyService.js  # Party lifecycle management
│   │   └── SocketService.js # WebSocket event handling
│   └── utils/               # Utility functions
│       ├── messageGenerator.js # Game message system
│       └── validators.js    # Input validation
├── public/                  # Frontend assets
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   └── styles.css      # Complete styling
│   ├── js/
│   │   ├── game.js         # Game logic client
│   │   ├── socket-client.js # WebSocket client
│   │   └── ui.js           # User interface management
│   ├── assets/             # Images and icons
│   └── manifest.json       # PWA configuration
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Game Settings
CLEANUP_INTERVAL=300000
INACTIVITY_TIMEOUT=600000

# Security
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### Game Settings

Modify `config/config.js` to customize:

```javascript
module.exports = {
    // Party settings
    PARTY_CODE_LENGTH: 6,
    MAX_PLAYERS_PER_PARTY: 2,
    
    // Game rules
    DEFAULT_RANGE_START: 1,
    DEFAULT_RANGE_END: 100,
    SELECTION_TIME_LIMIT: 30,
    
    // Performance
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
    INACTIVITY_TIMEOUT: 10 * 60 * 1000, // 10 minutes
};
```

## 🎨 Customization

### Adding New Game Messages

Edit `config/config.js` to add custom feedback messages:

```javascript
GAME_MESSAGES: {
    TOO_HIGH: [
        "🔥 Way too high! Come back down to earth!",
        "Your custom message here!"
    ],
    // ... add more message categories
}
```

### Styling Customization

The CSS uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #4facfe;
    --secondary-color: #00f2fe;
    --background-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    /* ... customize colors */
}
```

### Adding New Game Modes

1. Extend the `Game` model with new rules
2. Update the `GameService` for new game flow
3. Add UI components in the frontend
4. Update socket event handlers

## 📱 Mobile & PWA Features

### Installation
- **Add to Home Screen** on mobile devices
- **Offline gameplay** support (local games)
- **Push notifications** for game invites
- **Responsive design** for all screen sizes

### Mobile Optimizations
- **Touch-friendly** large buttons and inputs
- **Swipe gestures** for navigation
- **Vibration feedback** for game events
- **Portrait/landscape** orientation support

## 🔒 Security Features

- **Input validation** and sanitization
- **Rate limiting** for API endpoints
- **CORS protection** with configurable origins
- **Helmet.js** security headers
- **No client-side secrets** exposed

## 📈 Performance & Scaling

### Built-in Optimizations
- **Automatic party cleanup** removes inactive games
- **Connection pooling** for efficient WebSocket management
- **Memory-efficient** player state management
- **Graceful degradation** for network issues

### Scaling Options
- **Redis adapter** for Socket.IO clustering
- **Load balancer** support with sticky sessions
- **Docker containerization** ready
- **PM2 cluster mode** for multi-core utilization

## 🐛 Debugging & Monitoring

### Development Tools
```javascript
// Browser console commands
Game.debugInfo()           // Current game state
socketClient.getConnectionStatus()  // Connection details
Game.simulateNetworkError()        // Test reconnection
```

### Server Monitoring
```bash
# View server stats
curl http://localhost:3000/api/health
curl http://localhost:3000/api/stats

# PM2 monitoring
pm2 monit
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server with hot reload
npm run dev

# Run linting
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Socket.IO** for real-time communication
- **Express.js** for the robust server framework
- **Modern CSS** features for the beautiful UI
- **Community feedback** for game improvements

## 🆘 Support

### Common Issues

**Connection Problems:**
- Check firewall settings
- Ensure WebSocket support in browser
- Try different network connection

**Game Sync Issues:**
- Refresh the page
- Check internet connection stability
- Clear browser cache

**Performance Issues:**
- Close other browser tabs
- Update to latest browser version
- Check system resources

### Getting Help
- 📧 **Email**: support@yourdomain.com
- 💬 **Discord**: [Join our server](https://discord.gg/yourserver)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/multiplayer-number-guesser/issues)
- 📖 **Documentation**: [Full docs](https://docs.yourdomain.com)

---

**Made with ❤️ for the love of multiplayer gaming!**

Enjoy challenging your friends and may the best guesser win! 🎯🏆