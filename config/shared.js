const SHARED_CONFIG = {
    DEFAULT_RANGE_START: 1,
    DEFAULT_RANGE_END: 100,
    MAX_RANGE_SIZE: 10000, 
    MIN_RANGE_SIZE: 5,

    GAME_MESSAGES: {
        TOO_HIGH: [
            "Way too high! Come back down to earth!",
            "That's stratosphere level! Think lower!",
            "Houston, we have a problem - too high!",
            "Nope, bring it down several notches!",
            "Your guess is floating in the clouds!",
            "That's mountain-top high!",
            "Whoa! Take it down a level!",
            "You're reaching the summit! Come down!",
            "That's outer space territory! Descend!",
            "Satellite level! Bring it way down!",
            "Aim lower, sharpshooter!",
            "Drop it like it's hot!"
        ],
        TOO_LOW: [
            "That's underground territory!",
            "You're mining too deep! Go higher!",
            "Think way higher than that!",
            "You're swimming in the deep end!",
            "That's basement level thinking!",
            "You're below sea level!",
            "Stop digging and climb up!",
            "Deep ocean vibes! Surface level please!",
            "You're in the subway! Go upstairs!",
            "Elevate your thinking!",
            "Aim higher, champion!",
            "Time to take off!"
        ],
        CLOSE_HIGH: [
            "Getting warm, but still too HIGH!",
            "Close! Just dial it down a bit!",
            "So close! Nudge it down slightly!",
            "Hot! But still flying too HIGH!",
            "In the neighborhood, but aim LOWER!",
            "Burning hot! Come down just a bit!",
            "Temperature rising! Cool it down!",
            "Good shot! Just adjust down!",
            "You're in the zone! Step down!",
            "Right direction! Just lower!",
            "Close call! Paint it lower!",
            "Almost balanced! Tip it down!"
        ],
        CLOSE_LOW: [
            "Getting warm, but still too LOW!",
            "Close! Just bump it up a bit!",
            "So close! Nudge it up slightly!",
            "Hot! But still diving too LOW!",
            "In the neighborhood, but aim HIGHER!",
            "Burning hot! Climb up just a bit!",
            "Temperature rising! Heat it up!",
            "Good shot! Just adjust up!",
            "You're in the zone! Step up!",
            "Right direction! Just higher!",
            "Close call! Paint it higher!",
            "Almost balanced! Tip it up!"
        ],
        VERY_CLOSE_HIGH: [
            "SO CLOSE! Just a tiny bit LOWER!",
            "Almost perfect! Go down just a smidge!",
            "You're practically there! Slightly LOWER!",
            "BURNING HOT! Just nudge it down!",
            "Right on the edge! Think LOWER!",
            "Diamond close! Polish it down!",
            "Bullseye territory! A hair lower!",
            "Crystal ball says: DOWN just a notch!",
            "Champion level! Just a whisper down!",
            "Electric! Just a spark lower!"
        ],
        VERY_CLOSE_LOW: [
            "SO CLOSE! Just a tiny bit HIGHER!",
            "Almost perfect! Go up just a smidge!",
            "You're practically there! Slightly HIGHER!",
            "BURNING HOT! Just nudge it up!",
            "Right on the edge! Think HIGHER!",
            "Diamond close! Polish it up!",
            "Bullseye territory! A hair higher!",
            "Crystal ball says: UP just a notch!",
            "Champion level! Just a whisper up!",
            "Electric! Just a spark higher!"
        ]
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SHARED_CONFIG;
}