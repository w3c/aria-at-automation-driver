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
  const connect = (port, subProtocol) => {
    const client = new WebSocket(`ws://localhost:${port}`, subProtocol);

    return new Promise((resolve, reject) => {
      client.on('error', reject);
      client.on('open', resolve);
    });
  };
  teardown(() => {
    children.forEach((child) => child.kill());
    children.length = 0;
  });

  test('WebSocket server on default port', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, connect(4382, SUB_PROTOCOL)]);
  });

  test('WebSocket server on custom port', async () => {
    const {whenClosed} = await run(['--port', '6543']);
    return Promise.race([whenClosed, connect(6543, SUB_PROTOCOL)]);
  });

  test('rejects unspecified protocol', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382))]);
  });

  test('rejects unsupported protocol', async () => {
    const {whenClosed} = await run([]);
    return Promise.race([whenClosed, invert(connect(4382, 'aria-at.bocoup.com'))]);
  });

  test('rejects invalid port values: unspecified', async () => {
    const {whenClosed} = await run(['--port']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: non-numeric', async () => {
    const {whenClosed} = await run(['--port', 'seven']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: negative', async () => {
    const {whenClosed} = await run(['--port', '-8000']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: non-integer', async () => {
    const {whenClosed} = await run(['--port', '2004.3']);
    return invert(whenClosed);
  });

  test('rejects invalid port values: non-decimal', async () => {
    const {whenClosed} = await run(['--port', '0x1000']);
    return invert(whenClosed);
  });
});
