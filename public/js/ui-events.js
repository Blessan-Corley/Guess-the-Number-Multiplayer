(function attachUIEventMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(
    UIClass,
    global.UIInteractionSetupMethods || {},
    global.UIEventBindingMethods || {}
  );
})(window);
