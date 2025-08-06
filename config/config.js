module.exports = {
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Game Configuration
    PARTY_CODE_LENGTH: 6,
    MAX_PLAYERS_PER_PARTY: 2,
    SELECTION_TIME_LIMIT: 30, // seconds
    INACTIVITY_TIMEOUT: 10 * 60 * 1000, // 10 minutes in milliseconds
    CLEANUP_INTERVAL: process.env.CLEANUP_INTERVAL || 5 * 60 * 1000, // 5 minutes
    
    // Game Rules
    DEFAULT_RANGE_START: 1,
    DEFAULT_RANGE_END: 100,
    MAX_RANGE_SIZE: 1000,
    MIN_RANGE_SIZE: 10,
    
    // Socket Configuration
    SOCKET_TIMEOUT: 60000, // 60 seconds
    PING_INTERVAL: 25000, // 25 seconds
    PING_TIMEOUT: 60000, // 60 seconds
    
    // Rate Limiting
    MAX_PARTIES_PER_IP: 5,
    PARTY_CREATION_COOLDOWN: 30000, // 30 seconds
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_DEBUG: process.env.NODE_ENV === 'development',
    
    // Security
    CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
    
    // Performance
    ENABLE_COMPRESSION: true,
    ENABLE_CACHING: true,
    CACHE_DURATION: 3600, // 1 hour in seconds
    
    // Game Messages
    GAME_MESSAGES: {
        TOO_HIGH: [
            "🔥 Way too high! Come back down to earth!",
            "📈 That's stratosphere level! Think lower!",
            "🚀 Houston, we have a problem - too high!",
            "⬆️ Nope, bring it down several notches!",
            "🎈 Your guess is floating in the clouds!",
            "🏔️ That's mountain-top high!"
        ],
        TOO_LOW: [
            "🕳️ That's underground territory!",
            "📉 You're mining too deep! Go higher!",
            "⬇️ Think way higher than that!",
            "🐠 You're swimming in the deep end!",
            "🏠 That's basement level thinking!",
            "🌊 You're below sea level!"
        ],
        CLOSE_HIGH: [
            "🔥 Getting warm, but still too HIGH!",
            "🎯 Close! Just dial it down a bit!",
            "👀 So close! Nudge it down slightly!",
            "⚡ Hot! But still flying too HIGH!",
            "🎪 In the neighborhood, but aim LOWER!",
            "🔍 Burning hot! Come down just a bit!"
        ],
        CLOSE_LOW: [
            "🔥 Getting warm, but still too LOW!",
            "🎯 Close! Just bump it up a bit!",
            "👀 So close! Nudge it up slightly!",
            "⚡ Hot! But still diving too LOW!",
            "🎪 In the neighborhood, but aim HIGHER!",
            "🔍 Burning hot! Climb up just a bit!"
        ],
        VERY_CLOSE_HIGH: [
            "🌟 SO CLOSE! Just a tiny bit LOWER!",
            "💫 Almost perfect! Go down just a smidge!",
            "🎊 You're practically there! Slightly LOWER!",
            "🔥 BURNING HOT! Just nudge it down!",
            "⭐ Right on the edge! Think LOWER!"
        ],
        VERY_CLOSE_LOW: [
            "🌟 SO CLOSE! Just a tiny bit HIGHER!",
            "💫 Almost perfect! Go up just a smidge!",
            "🎊 You're practically there! Slightly HIGHER!",
            "🔥 BURNING HOT! Just nudge it up!",
            "⭐ Right on the edge! Think HIGHER!"
        ]
    },
    
    // Development Configuration
    DEV_OPTIONS: {
        AUTO_FILL_PLAYERS: process.env.NODE_ENV === 'development',
        REDUCED_TIMERS: process.env.NODE_ENV === 'development',
        VERBOSE_LOGGING: process.env.NODE_ENV === 'development'
    }
};