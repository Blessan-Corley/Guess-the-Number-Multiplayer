(function attachUIMultiplayerRenderMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(
    UIClass,
    global.UIPartyLobbyRenderMethods || {},
    global.UISettingsSelectionRenderMethods || {},
    global.UILiveGameRenderMethods || {}
  );
})(window);
