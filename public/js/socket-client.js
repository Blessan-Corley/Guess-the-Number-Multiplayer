class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.gameState = this.createInitialGameState();
    this.connectionTelemetry = this.createInitialConnectionTelemetry();
    this.pendingActions = [];

    this.init();
  }
}

Object.assign(
  SocketClient.prototype,
  window.SocketClientCoreMethods || {},
  window.SocketClientEmitMethods || {},
  window.SocketClientReconnectMethods || {}
);

const socketClient = new SocketClient();
window.socketClient = socketClient;
