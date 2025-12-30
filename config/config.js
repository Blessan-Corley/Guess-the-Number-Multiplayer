const sharedConfig = require('./shared');

module.exports = {
    ...sharedConfig,
    
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    
    PARTY_CODE_LENGTH: 6,
    MAX_PLAYERS_PER_PARTY: 2,
    SELECTION_TIME_LIMIT: 30, 
    INACTIVITY_TIMEOUT: 10 * 60 * 1000, 
    CLEANUP_INTERVAL: process.env.CLEANUP_INTERVAL || 5 * 60 * 1000, 
    
    
    SOCKET_TIMEOUT: 60000, 
    PING_INTERVAL: 25000, 
    PING_TIMEOUT: 60000, 
    
    
    MAX_PARTIES_PER_IP: 5,
    PARTY_CREATION_COOLDOWN: 30000, 
    
    
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_DEBUG: process.env.NODE_ENV === 'development',
    
    
    CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
    
    
    ENABLE_COMPRESSION: true,
    ENABLE_CACHING: true,
    CACHE_DURATION: 3600, 
    
    
    DEV_OPTIONS: {
        AUTO_FILL_PLAYERS: process.env.NODE_ENV === 'development',
        REDUCED_TIMERS: process.env.NODE_ENV === 'development',
        VERBOSE_LOGGING: process.env.NODE_ENV === 'development'
    }
};