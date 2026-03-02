(function registerGameRoundHandlers(global) {
  global.GameRoundHandlers = {
    ...(global.GameRoundResultHandlers || {}),
    ...(global.GameRoundActionHandlers || {}),
    ...(global.GameRoundStateHandlers || {}),
  };
})(window);
