(function attachGameSocketHandlers(global) {
  const GameClass = global.Game || (typeof Game !== 'undefined' ? Game : null);
  if (!GameClass) {
    return;
  }

  Object.assign(GameClass, global.GamePartyHandlers || {}, global.GameRoundHandlers || {});
})(window);
