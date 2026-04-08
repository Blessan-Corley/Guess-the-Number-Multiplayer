describe('Socket connection telemetry', () => {
  let methods;

  beforeEach(() => {
    jest.resetModules();

    global.window = global;
    global.AppActions = {
      setConnectionStatus: jest.fn(),
    };
    global.performance = {
      now: jest.fn(),
    };

    require('../../public/js/socket-client-core-methods');
    methods = global.SocketClientCoreMethods;
  });

  afterEach(() => {
    delete global.SocketClientCoreMethods;
    delete global.AppActions;
    delete global.performance;
    delete global.window;
  });

  function createClient() {
    return {
      isConnected: true,
      reconnectAttempts: 0,
      socket: { id: 'socket-1' },
      connectionTelemetry: methods.createInitialConnectionTelemetry(),
      evaluateConnectionSignal: methods.evaluateConnectionSignal,
      recordHeartbeatAck: methods.recordHeartbeatAck,
    };
  }

  test('classifies a 300ms heartbeat as fair instead of unstable', () => {
    const client = createClient();

    global.performance.now.mockReturnValue(400);

    const telemetry = client.recordHeartbeatAck({
      clientPerfNow: 100,
    });

    expect(telemetry).toEqual({
      latencyMs: 300,
      signal: 'fair',
    });
    expect(client.connectionTelemetry).toMatchObject({
      latencyMs: 300,
      smoothedLatencyMs: 300,
      signal: 'fair',
    });
  });

  test('requires sustained severe latency before marking the connection unstable', () => {
    const client = createClient();

    global.performance.now.mockReturnValue(800);
    const first = client.recordHeartbeatAck({ clientPerfNow: 0 });

    global.performance.now.mockReturnValue(1600);
    const second = client.recordHeartbeatAck({ clientPerfNow: 800 });

    global.performance.now.mockReturnValue(2400);
    const third = client.recordHeartbeatAck({ clientPerfNow: 1600 });

    expect(first).toEqual({
      latencyMs: 800,
      signal: 'weak',
    });
    expect(second).toEqual({
      latencyMs: 800,
      signal: 'weak',
    });
    expect(third).toEqual({
      latencyMs: 800,
      signal: 'unstable',
    });
  });
});
