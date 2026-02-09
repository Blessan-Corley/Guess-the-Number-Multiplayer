const config = require('../../../../config/config');

module.exports = {
  updateSettings(settings, hostId) {
    if (hostId !== this.hostId) {
      throw new Error('Only host can update settings');
    }

    if (this.gameState.phase !== 'lobby') {
      throw new Error('Cannot update settings during active game');
    }

    const previousSettings = { ...this.gameSettings };

    try {
      if (settings.rangeStart !== undefined) {
        const start = parseInt(settings.rangeStart, 10);
        if (
          Number.isNaN(start) ||
          start < config.MIN_RANGE_VALUE ||
          start > config.MAX_RANGE_VALUE
        ) {
          throw new Error(
            `Invalid range start (must be ${config.MIN_RANGE_VALUE}-${config.MAX_RANGE_VALUE})`
          );
        }
        this.gameSettings.rangeStart = start;
      }

      if (settings.rangeEnd !== undefined) {
        const end = parseInt(settings.rangeEnd, 10);
        if (Number.isNaN(end) || end < config.MIN_RANGE_VALUE + 1 || end > config.MAX_RANGE_VALUE) {
          throw new Error(
            `Invalid range end (must be ${config.MIN_RANGE_VALUE + 1}-${config.MAX_RANGE_VALUE})`
          );
        }
        this.gameSettings.rangeEnd = end;
      }

      if (settings.selectionTimeLimit !== undefined) {
        const selectionTimeLimit = parseInt(settings.selectionTimeLimit, 10);
        if (
          Number.isNaN(selectionTimeLimit) ||
          selectionTimeLimit < 10 ||
          selectionTimeLimit > 120
        ) {
          throw new Error('Invalid selection time limit (must be 10-120 seconds)');
        }
        this.gameSettings.selectionTimeLimit = selectionTimeLimit;
      }

      if (this.gameSettings.rangeEnd <= this.gameSettings.rangeStart) {
        throw new Error('Range end must be greater than range start');
      }

      const rangeSize = this.gameSettings.rangeEnd - this.gameSettings.rangeStart + 1;
      if (rangeSize < config.MIN_RANGE_SIZE) {
        throw new Error(`Range must be at least ${config.MIN_RANGE_SIZE} numbers`);
      }

      if (rangeSize > config.MAX_RANGE_SIZE) {
        throw new Error(`Range cannot exceed ${config.MAX_RANGE_SIZE} numbers`);
      }

      this.updateActivity();
      this._incrementStateVersion();
      return this.gameSettings;
    } catch (error) {
      this.gameSettings = previousSettings;
      throw error;
    }
  },
};
