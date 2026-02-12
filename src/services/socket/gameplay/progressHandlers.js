module.exports = {
  async broadcastProgressUpdates(party) {
    if (!this.profileService) {
      return;
    }

    const leaderboard = await this.profileService.getLeaderboard();

    await Promise.all(
      Array.from(party.players.values()).map(async (player) => {
        if (!player.profileId) {
          return;
        }

        const [profile, matches] = await Promise.all([
          this.profileService.getProfileById(player.profileId),
          this.profileService.getMatchHistory(player.profileId),
        ]);

        if (!profile) {
          return;
        }

        this.io.to(player.socketId).emit('profile_updated', {
          profile,
          matches,
        });
      })
    );

    this.io.emit('leaderboard_updated', {
      leaderboard,
    });
  },
};
