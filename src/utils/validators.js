const config = require('../../config/config');

class Validators {
    // Validate party code
    static validatePartyCode(code) {
        const errors = [];
        
        if (!code) {
            errors.push('Party code is required');
        } else if (typeof code !== 'string') {
            errors.push('Party code must be a string');
        } else {
            const cleanCode = code.trim().toUpperCase();
            
            if (cleanCode.length !== config.PARTY_CODE_LENGTH) {
                errors.push(`Party code must be exactly ${config.PARTY_CODE_LENGTH} characters long`);
            }
            
            if (!/^[A-Z0-9]+$/.test(cleanCode)) {
                errors.push('Party code can only contain letters and numbers');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: code ? code.trim().toUpperCase() : null
        };
    }

    // Validate player name
    static validatePlayerName(name) {
        const errors = [];
        
        if (!name) {
            errors.push('Player name is required');
        } else if (typeof name !== 'string') {
            errors.push('Player name must be a string');
        } else {
            const cleanName = name.trim();
            
            if (cleanName.length === 0) {
                errors.push('Player name cannot be empty');
            } else if (cleanName.length > 20) {
                errors.push('Player name cannot be longer than 20 characters');
            } else if (cleanName.length < 2) {
                errors.push('Player name must be at least 2 characters long');
            }
            
            if (!/^[a-zA-Z0-9\s\-_]+$/.test(cleanName)) {
                errors.push('Player name can only contain letters, numbers, spaces, hyphens, and underscores');
            }
            
            // Check for inappropriate content (basic filter)
            const inappropriateWords = ['admin', 'bot', 'system', 'server', 'null', 'undefined'];
            if (inappropriateWords.some(word => cleanName.toLowerCase().includes(word))) {
                errors.push('Player name contains restricted words');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: name ? name.trim() : null
        };
    }

    // Validate number guess
    static validateGuess(guess, rangeStart, rangeEnd) {
        const errors = [];
        
        if (guess === null || guess === undefined) {
            errors.push('Guess is required');
        } else if (typeof guess !== 'number' || isNaN(guess)) {
            errors.push('Guess must be a valid number');
        } else if (!Number.isInteger(guess)) {
            errors.push('Guess must be a whole number');
        } else {
            if (guess < rangeStart) {
                errors.push(`Guess must be at least ${rangeStart}`);
            }
            
            if (guess > rangeEnd) {
                errors.push(`Guess must be at most ${rangeEnd}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: typeof guess === 'number' ? Math.floor(guess) : null
        };
    }

    // Validate secret number
    static validateSecretNumber(number, rangeStart, rangeEnd) {
        return this.validateGuess(number, rangeStart, rangeEnd);
    }

    // Validate game range
    static validateGameRange(rangeStart, rangeEnd) {
        const errors = [];
        
        if (typeof rangeStart !== 'number' || isNaN(rangeStart)) {
            errors.push('Range start must be a valid number');
        }
        
        if (typeof rangeEnd !== 'number' || isNaN(rangeEnd)) {
            errors.push('Range end must be a valid number');
        }
        
        if (errors.length === 0) {
            const start = Math.floor(rangeStart);
            const end = Math.floor(rangeEnd);
            
            if (start < 1) {
                errors.push('Range start must be at least 1');
            }
            
            if (end <= start) {
                errors.push('Range end must be greater than range start');
            }
            
            const rangeSize = end - start + 1;
            if (rangeSize < config.MIN_RANGE_SIZE) {
                errors.push(`Range must be at least ${config.MIN_RANGE_SIZE} numbers`);
            }
            
            if (rangeSize > config.MAX_RANGE_SIZE) {
                errors.push(`Range cannot exceed ${config.MAX_RANGE_SIZE} numbers`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: errors.length === 0 ? {
                start: Math.floor(rangeStart),
                end: Math.floor(rangeEnd)
            } : null
        };
    }

    // Validate game settings
    static validateGameSettings(settings) {
        const errors = [];
        const cleanSettings = {};
        
        if (settings.rangeStart !== undefined || settings.rangeEnd !== undefined) {
            const rangeValidation = this.validateGameRange(
                settings.rangeStart || config.DEFAULT_RANGE_START,
                settings.rangeEnd || config.DEFAULT_RANGE_END
            );
            
            if (!rangeValidation.valid) {
                errors.push(...rangeValidation.errors);
            } else {
                cleanSettings.rangeStart = rangeValidation.cleanValue.start;
                cleanSettings.rangeEnd = rangeValidation.cleanValue.end;
            }
        }
        
        if (settings.bestOfThree !== undefined) {
            if (typeof settings.bestOfThree !== 'boolean') {
                errors.push('Best of three setting must be true or false');
            } else {
                cleanSettings.bestOfThree = settings.bestOfThree;
            }
        }
        
        if (settings.selectionTimeLimit !== undefined) {
            if (typeof settings.selectionTimeLimit !== 'number' || 
                settings.selectionTimeLimit < 10 || 
                settings.selectionTimeLimit > 120) {
                errors.push('Selection time limit must be between 10 and 120 seconds');
            } else {
                cleanSettings.selectionTimeLimit = Math.floor(settings.selectionTimeLimit);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: cleanSettings
        };
    }

    // Validate socket data
    static validateSocketData(data, requiredFields = []) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Invalid data format');
            return { valid: false, errors };
        }
        
        requiredFields.forEach(field => {
            if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: data
        };
    }

    // Validate reconnection data
    static validateReconnectionData(data) {
        const errors = [];
        
        if (!data.partyCode) {
            errors.push('Party code is required for reconnection');
        } else {
            const codeValidation = this.validatePartyCode(data.partyCode);
            if (!codeValidation.valid) {
                errors.push(...codeValidation.errors);
            }
        }
        
        if (!data.playerId) {
            errors.push('Player ID is required for reconnection');
        } else if (typeof data.playerId !== 'string') {
            errors.push('Player ID must be a string');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: {
                partyCode: data.partyCode ? data.partyCode.trim().toUpperCase() : null,
                playerId: data.playerId
            }
        };
    }

    // Sanitize HTML to prevent XSS
    static sanitizeHtml(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // Rate limiting validation
    static validateRateLimit(socketId, action, rateLimits = new Map()) {
        const now = Date.now();
        const key = `${socketId}_${action}`;
        const lastAction = rateLimits.get(key);
        
        const cooldowns = {
            'create_party': 30000, // 30 seconds
            'join_party': 5000,    // 5 seconds
            'make_guess': 1000,    // 1 second
            'start_game': 10000,   // 10 seconds
            'rematch': 5000        // 5 seconds
        };
        
        const cooldown = cooldowns[action] || 1000;
        
        if (lastAction && (now - lastAction) < cooldown) {
            return {
                valid: false,
                error: `Please wait ${Math.ceil((cooldown - (now - lastAction)) / 1000)} seconds before ${action.replace('_', ' ')}`,
                remainingTime: cooldown - (now - lastAction)
            };
        }
        
        rateLimits.set(key, now);
        return { valid: true };
    }

    // Validate IP address format
    static validateIPAddress(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    // Validate session data
    static validateSession(sessionData) {
        const errors = [];
        
        if (!sessionData) {
            errors.push('Session data is required');
            return { valid: false, errors };
        }
        
        if (!sessionData.playerId || typeof sessionData.playerId !== 'string') {
            errors.push('Valid player ID is required');
        }
        
        if (!sessionData.partyCode) {
            const codeValidation = this.validatePartyCode(sessionData.partyCode);
            if (!codeValidation.valid) {
                errors.push('Valid party code is required');
            }
        }
        
        if (sessionData.timestamp && typeof sessionData.timestamp !== 'number') {
            errors.push('Invalid timestamp format');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue: sessionData
        };
    }

    // Comprehensive input validation
    static validateInput(input, rules) {
        const errors = [];
        let cleanValue = input;
        
        // Required check
        if (rules.required && (input === null || input === undefined || input === '')) {
            errors.push(`${rules.field || 'Field'} is required`);
            return { valid: false, errors, cleanValue: null };
        }
        
        // Type check
        if (input !== null && input !== undefined && rules.type) {
            if (typeof input !== rules.type) {
                errors.push(`${rules.field || 'Field'} must be of type ${rules.type}`);
            }
        }
        
        // String validations
        if (typeof input === 'string') {
            cleanValue = input.trim();
            
            if (rules.minLength && cleanValue.length < rules.minLength) {
                errors.push(`${rules.field || 'Field'} must be at least ${rules.minLength} characters`);
            }
            
            if (rules.maxLength && cleanValue.length > rules.maxLength) {
                errors.push(`${rules.field || 'Field'} cannot exceed ${rules.maxLength} characters`);
            }
            
            if (rules.pattern && !rules.pattern.test(cleanValue)) {
                errors.push(`${rules.field || 'Field'} format is invalid`);
            }
            
            if (rules.sanitize) {
                cleanValue = this.sanitizeHtml(cleanValue);
            }
        }
        
        // Number validations
        if (typeof input === 'number') {
            if (rules.min !== undefined && input < rules.min) {
                errors.push(`${rules.field || 'Field'} must be at least ${rules.min}`);
            }
            
            if (rules.max !== undefined && input > rules.max) {
                errors.push(`${rules.field || 'Field'} cannot exceed ${rules.max}`);
            }
            
            if (rules.integer && !Number.isInteger(input)) {
                errors.push(`${rules.field || 'Field'} must be a whole number`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            cleanValue
        };
    }

    // Batch validation
    static validateBatch(data, validationRules) {
        const results = {};
        const allErrors = [];
        let isValid = true;
        
        Object.keys(validationRules).forEach(field => {
            const result = this.validateInput(data[field], {
                ...validationRules[field],
                field
            });
            
            results[field] = result;
            
            if (!result.valid) {
                isValid = false;
                allErrors.push(...result.errors);
            }
        });
        
        return {
            valid: isValid,
            errors: allErrors,
            fieldResults: results,
            cleanData: Object.keys(results).reduce((clean, field) => {
                if (results[field].valid) {
                    clean[field] = results[field].cleanValue;
                }
                return clean;
            }, {})
        };
    }
}

module.exports = Validators;