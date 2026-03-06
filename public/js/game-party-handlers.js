(function registerGamePartyHandlers(global) {
  global.GamePartyHandlers = {
    ...(global.GamePartyLifecycleHandlers || {}),
    ...(global.GamePartyGameplayHandlers || {}),
  };
})(window);
