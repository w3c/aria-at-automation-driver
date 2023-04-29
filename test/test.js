'use strict';
const assert = require('assert');
const path = require('path');
const child_process = require('child_process');

const WebSocket = require('ws');

const SUB_PROTOCOL = 'v1.aria-at.bocoup.com';
const executable = path.join(__dirname, '..', 'bin', 'at-driver');
const invert = (promise) => promise.then(
  () => { throw new Error('expected promise to be rejected, but it was fulfilled'); },
  () => {}
);

suite('at-driver', () => {
  const children = [];
  const run = (args) => {
    const child = child_process.spawn(process.execPath, [executable, ...args]);
    children.push(child);
    const whenClosed = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', () => reject(new Error('Server closed unexpectedly')));
    });
    return new Promise((resolve, reject) => {
      child.stderr.on('data', () => resolve({whenClosed}));
      whenClosed.catch(reject);
    });
  };
  const connect = (port, query, subProtocol) => {
    const websocket = new WebSocket(`ws://localhost:${port}?${query}`, subProtocol);

    return new Promise((resolve, reject) => {
      websocket.on('error', reject);
      websocket.on('open', () => resolve(websocket));
    });
  };
  teardown(() => {
    children.forEach((child) => child.kill());
    children.length = 0;
  });

  test('WebSocket server on default port', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, connect(4382, 'at=nvda', SUB_PROTOCOL)]);
  });

  test('WebSocket server on custom port', async () => {
    const {whenClosed} = await run(['--port', '6543']);
    return Promise.race([whenClosed, connect(6543, 'at=nvda', SUB_PROTOCOL)]);
  });

  test('WebSocket server on default port using alternate assistive technology port', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, connect(4382, 'at=nvda&port=8084', SUB_PROTOCOL)]);
  });

  test('server rejects unspecified protocol', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'at=nvda'))]);
  });

  test('server rejects unsupported protocol', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'at=nvda', 'aria-at.bocoup.com'))]);
  });

  test('CLI rejects invalid port values: unspecified', async () => {
    const {whenClosed} = await run(['--port']);
    return invert(whenClosed);
  });

  test('CLI rejects invalid port values: non-numeric', async () => {
    const {whenClosed} = await run(['--port', 'seven']);
    return invert(whenClosed);
  });

  test('CLI rejects invalid port values: negative', async () => {
    const {whenClosed} = await run(['--port', '-8000']);
    return invert(whenClosed);
  });

  test('CLI rejects invalid port values: non-integer', async () => {
    const {whenClosed} = await run(['--port', '2004.3']);
    return invert(whenClosed);
  });

  test('CLI rejects invalid port values: non-decimal', async () => {
    const {whenClosed} = await run(['--port', '0x1000']);
    return invert(whenClosed);
  });

  test('server rejects unspecified assistive technology', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, '', SUB_PROTOCOL))]);
  });

  test('server rejects empty assistive technology', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'at=', SUB_PROTOCOL))]);
  });

  test('server rejects unrecognized assistive technology', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'at=foo', SUB_PROTOCOL))]);
  });

  test('server rejects empty assistive technology port', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'at=nvda&port=', SUB_PROTOCOL))]);
  });

  test('server rejects empty assistive technology port', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'at=nvda&port=a', SUB_PROTOCOL))]);
  });

  suite('protocol', () => {
    let websocket, whenClosed;
    const nextMessage = (websocket) => {
      return new Promise((resolve, reject) => {
        websocket.once('message', (buffer) => {
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
      ({whenClosed} = await run([]));

      websocket = await Promise.race([whenClosed, connect(4382, 'at=nvda', SUB_PROTOCOL)]);
    });

    test('rejects non-JSON messages', async () => {
      websocket.send('not JSON');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: null,
        error: 'Unable to parse message: "not JSON".'
      });
    });

    test('rejects non-Object messages', async () => {
      websocket.send('[]');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: null,
        error: 'Malformed message: "[]".'
      });
    });

    test('rejects non-Command messages', async () => {
      websocket.send('{"id": 1, "type": "foobar"}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: null,
        error: 'Unrecognized message type: "{"id": 1, "type": "foobar"}".'
      });
    });

    test('rejects Command messages with omitted "id"', async () => {
      websocket.send('{"type": "command", "name": "keyPress", "params": ["A"]}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: null,
        error: 'Command missing required "id": "{"type": "command", "name": "keyPress", "params": ["A"]}".'
      });
    });

    test('rejects unrecognized Command', async () => {
      websocket.send('{"type": "command", "id": 7, "name": "press"}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: 7,
        error: 'Unrecognized command name: "{"type": "command", "id": 7, "name": "press"}".'
      });
    });

    test('accepts valid "pressKey" Command', async () => {
      websocket.send('{"type": "command", "id": 83, "name": "pressKey", "params": [" "]}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: 83,
        result: null
      });
    });

    test('rejects invalid "pressKey" Command', async () => {
      websocket.send('{"type": "command", "id": 902, "name": "pressKey", "params": ["df daf% ?"]}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: 902,
        error: 'Invalid key code specified.'
      });
    });

    test('accepts valid "releaseKey" Command', async () => {
      websocket.send('{"type": "command", "id": 23221, "name": "releaseKey", "params": ["A"]}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: 23221,
        result: null
      });
    });

    test('rejects invalid "releaseKey" Command', async () => {
      websocket.send('{"type": "command", "id": 11, "name": "pressKey", "params": ["invalid"]}');
      const message = await Promise.race([whenClosed, nextMessage(websocket)]);

      assert.deepEqual(message, {
        type: 'response',
        id: 11,
        error: 'Invalid key code specified.'
      });
    });
  });
});
