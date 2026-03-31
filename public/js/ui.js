class UI {
  static init() {
    this.setupEventListeners();
    this.setupInputValidation();
    this.setupKeyboardShortcuts();
    this.showScreen('welcomeScreen');
    this.setupNavigationConfirmation();
    this.setupEnhancedUI();
    this.notificationQueue = [];
    this.maxNotifications = 3;

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    setInterval(() => {
      this.simpleButtonCheck();
    }, 30000);
  }
}

window.UI = UI;
