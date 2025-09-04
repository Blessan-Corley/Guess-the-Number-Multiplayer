# 🎯 Number Guesser - Real-time Multiplayer Game

A real-time multiplayer number guessing game built with Node.js and Socket.IO. Challenge friends in exciting brain battles with smart AI feedback and beautiful UI.

## ✨ Key Features

### 🎮 Core Gameplay
- **Real-time multiplayer** - Instant synchronization across devices
- **Smart AI opponent** - Multiple difficulty levels for single-player
- **Dynamic ranges** - Play with numbers from 1-10000
- **Single round matches** - Quick and engaging gameplay
- **Intelligent feedback** - Context-aware hints (close/far, high/low)
- **Session tracking** - Win counts and performance stats

### 🛠️ Technical Highlights
- **WebSocket communication** - Zero-lag real-time gameplay
- **Progressive Web App** - Install on any device as an app
- **Mobile-first design** - Responsive and touch-friendly
- **Auto-reconnection** - Handles network interruptions gracefully  
- **Party code system** - Easy friend invitations with 6-digit codes
- **Clean architecture** - Modular MVC design for maintainability

### 🎨 User Experience
- **Smooth UI/UX** - Modern gradients and smooth animations
- **Visual feedback** - Win badges, difficulty indicators, and performance tracking
- **Accessibility features** - Screen reader support and keyboard navigation
- **Cross-platform** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Visit http://localhost:3000
```

## 🏗️ Technology Stack

**Backend:**
- Node.js with Express.js
- Socket.IO for real-time communication
- UUID for unique identifiers
- Security middleware (Helmet, CORS)

**Frontend:**
- Vanilla JavaScript (ES6+)
- Modern CSS3 with animations
- Web Audio API for sound effects
- PWA features with service worker

**Architecture:**
- Event-driven design with Socket.IO
- Modular MVC pattern
- Real-time state synchronization
- Automatic cleanup and memory management

## 🎮 How to Play

1. **Create/Join Party** - Share a 6-digit code with friends
2. **Choose Settings** - Set number range as you like between (1-10000) and game mode
3. **Select Secret** - Pick your number strategically  
4. **Battle Phase** - Guess opponent's number with smart feedback
5. **Win & Repeat** - Track session wins and play again

## 📁 Project Structure

```
src/
├── models/           # Game logic (Player, Party, Game)
├── services/         # Business logic (GameService, SocketService)
└── utils/           # Helpers (validators, message generator)

public/
├── js/              # Client-side game logic
├── css/             # Styling and animations  
└── assets/          # Images and favicon
```

## 🔧 Configuration

Environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development
CLEANUP_INTERVAL=300000
```

Game settings in `config/config.js`:
- Party size, timeouts, and range limits
- Customizable feedback messages
- Performance optimization settings

## 📱 PWA Features

- **Offline capable** - Service worker for offline gameplay
- **Add to homescreen** - Native app-like experience
- **Responsive design** - Works on all device sizes
- **Fast loading** - Optimized assets and caching

## 🚀 Deployment Ready

- **PM2 process management** - Production-ready scaling
- **Docker support** - Containerized deployment
- **Load balancer compatible** - Horizontal scaling
- **Security hardened** - Input validation and rate limiting

## 🎯 Performance Optimizations

- Automatic party cleanup for memory efficiency
- Optimized WebSocket event handling  
- Client-side state management
- Graceful error handling and recovery

---

**Perfect for showcasing:**
- Real-time web technologies
- Modern JavaScript development
- Responsive design principles  
- Multiplayer game architecture
- Production deployment skills

*Built with ❤️ for friends who needs fun!* 🎮✨

*If you find any bugs in the game feels free to open issue*