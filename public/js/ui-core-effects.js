(function attachUIEffectsMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    animateElement(element, animationClass, duration = 1000) {
      element.classList.add(animationClass);
      setTimeout(() => {
        element.classList.remove(animationClass);
      }, duration);
    },

    highlightElement(elementId, duration = 2000) {
      const element = document.getElementById(elementId);
      if (!element) {
        return;
      }

      element.style.boxShadow = '0 0 20px rgba(79, 172, 254, 0.5)';
      element.style.transform = 'scale(1.02)';
      setTimeout(() => {
        element.style.boxShadow = '';
        element.style.transform = '';
      }, duration);
    },
  });
})(window);
