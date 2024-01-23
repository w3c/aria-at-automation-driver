'use strict';
const assert = require('assert');
const path = require('path');
const child_process = require('child_process');
const net = require('net');

const WebSocket = require('ws');

const executable = path.join(__dirname, '..', 'bin', 'at-driver');
const invert = promise =>
  promise.then(
    () => {
      throw new Error('expected promise to be rejected, but it was fulfilled');
    },
    () => {},
  );

suite('at-driver', () => {
  const children = [];
  const run = args => {
    const child = child_process.spawn(process.execPath, [executable, ...args]);
    children.push(child);
    const whenClosed = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', () => reject(new Error('Server closed unexpectedly')));
    });
    return new Promise((resolve, reject) => {
      child.stderr.on('data', () => resolve({ whenClosed }));
      whenClosed.catch(reject);
    });
  };
  const sendVoicePacket = async (type, data) => {
    const NAMED_PIPE = '\\\\?\\pipe\\my_pipe';
    const stream = await new Promise(resolve => {
      const stream = net.connect(NAMED_PIPE);
      stream.on('connect', () => resolve(stream));
    });
    await new Promise(resolve => stream.end(`${type}:${data}`, 'utf8', resolve));
  };
  const connect = port => {
    const websocket = new WebSocket(`ws://localhost:${port}/session`);

    return new Promise((resolve, reject) => {
      websocket.on('error', reject);
      websocket.on('open', () => resolve(websocket));
    });
  };
  teardown(() => {
    children.forEach(child => child.kill());
    children.length = 0;
  });

  test('WebSocket server on default port', async () => {
    const { whenClosed } = await run([]);
    return Promise.race([whenClosed, connect(4382)]);
  });

  test('WebSocket server on custom port', async () => {
    const { whenClosed } = await run(['--port', '6543']);
    return Promise.race([whenClosed, connect(6543)]);
  });

  test('rejects invalid port values: unspecified', async () => {
    const { whenClosed } = await run(['--port']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: non-numeric', async () => {
    const { whenClosed } = await run(['--port', 'seven']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: negative', async () => {
    const { whenClosed } = await run(['--port', '-8000']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: non-integer', async () => {
    const { whenClosed } = await run(['--port', '2004.3']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: non-decimal', async () => {
    const { whenClosed } = await run(['--port', '0x1000']);
    return invert(whenClosed);
  });

  suite('protocol', () => {
    let websocket, whenClosed;
    const nextMessage = websocket => {
      return new Promise((resolve, reject) => {
        websocket.once('message', buffer => {
          try {
            resolve(JSON.parse(buffer.toString()));
          } catch (error) {
            reject(error);
          }
        });
        websocket.once('error', reject);
      });
    };

    setup(async () => {
      ({ whenClosed } = await run([]));

      websocket = await Promise.race([whenClosed, connect(4382)]);
    });

    test('rejects non-JSON messages', async () => {
      websocket.send('not JSON');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: null,
        error: 'unknown error',
        message: 'Unable to parse message: "not JSON".',
      });
    });

    test('rejects non-Object messages', async () => {
      websocket.send('[]');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: null,
        error: 'unknown error',
        message: 'Malformed message: "[]".',
      });
    });

    test('rejects non-Command messages', async () => {
      websocket.send('{"id": 1, "type": "foobar"}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: null,
        error: 'unknown command',
        message: 'Unrecognized message type (no method): "{"id": 1, "type": "foobar"}".',
      });
    });

    test('rejects Command messages with omitted "id"', async () => {
      websocket.send('{"method": "interaction.pressKeys", "params": {"keys": ["A"]}}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: null,
        error: 'unknown error',
        message:
          'Command missing required "id": "{"method": "interaction.pressKeys", "params": {"keys": ["A"]}}".',
      });
    });

    test('rejects unrecognized Command', async () => {
      websocket.send('{"id": 7, "method": "press"}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: 7,
        error: 'unknown command',
      });
    });

    test('accepts valid "pressKey" Command', async () => {
      websocket.send('{"id": 83, "method": "interaction.pressKeys", "params": {"keys": [" "]}}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: 83,
        result: {},
      });
    });

    test('rejects invalid "pressKey" Command', async () => {
      websocket.send(
        '{"id": 902, "method": "interaction.pressKeys", "params": {"keys": ["df daf% ?"]}}',
      );
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        id: 902,
        error: 'unknown error',
        message: 'Invalid key code specified.',
      });
    });

    suite('with sessionId', () => {
      let sessionId, capabilities;
      setup(async () => {
        websocket.send('{"id": 527, "method": "session.new", "params": {}}');
        const message = await Promise.race([whenClosed, nextMessage(websocket)]);

        assert.ok(message.result);
        sessionId = message.result.sessionId;
        capabilities = message.result.capabilities;
      });

      test('returns a sessionId', () => {
        assert.notEqual(sessionId, undefined);
      });

      test('sends voice events', async () => {
        await Promise.race([whenClosed, sendVoicePacket('speech', 'Hello, world!')]);

        const message = await Promise.race([whenClosed, nextMessage(websocket)]);

        assert.deepEqual(message, {
          method: 'interaction.capturedOutput',
          params: {
            data: 'Hello, world!',
          },
        });
      });
    });
  });
});
