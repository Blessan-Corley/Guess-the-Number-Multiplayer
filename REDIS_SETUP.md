# Redis Setup Guide for Number Guesser

This application is architected to support Redis for scalable, persistent game state storage. By default, it uses in-memory storage, which is fast but loses data if the server restarts.

## Why use Redis?
- **Persistence:** Active games survive server restarts.
- **Scalability:** You can run multiple server instances (e.g., with PM2 cluster mode) and they will share the same game state.
- **Performance:** Efficient expiration of inactive games.

## Prerequisites
1. Install Redis on your machine (or use a cloud provider).
   - Windows: [Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install) and `sudo apt-get install redis-server`
   - Mac/Linux: `brew install redis` or `sudo apt-get install redis-server`

## Enabling Redis

1. **Install the Redis client package:**
   ```bash
   npm install redis
   ```

2. **Update `server.js`:**

   Locate the `GameServer` class constructor and modify the `PartyService` initialization:

   ```javascript
   // Add these imports at the top
   const { createClient } = require('redis');
   const RedisStore = require('./src/storage/RedisStore');

   // Inside GameServer constructor
   class GameServer {
       constructor() {
           // ... setup express ...

           // Initialize Redis
           this.initRedis(); 
       }

       async initRedis() {
           const redisClient = createClient({
               url: process.env.REDIS_URL || 'redis://localhost:6379'
           });

           redisClient.on('error', (err) => console.log('Redis Client Error', err));
           await redisClient.connect();

           // Inject RedisStore into PartyService
           const store = new RedisStore(redisClient);
           this.partyService = new PartyService(store);
           
           // Re-initialize SocketService with the new PartyService
           this.socketService = new SocketService(this.io, this.partyService);
       }
   }
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

The application will now automatically save all game state to Redis!
