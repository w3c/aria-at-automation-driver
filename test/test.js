'use strict';
const assert = require('assert');
const path = require('path');
const child_process = require('child_process');

const WebSocket = require('ws');

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
    return new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', () => reject(new Error('Server closed unexpectedly')));
    });
  };
  const connect = async (port) => {
    let client;
    do {
      client = new WebSocket(`ws://localhost:${port}`);

      await new Promise((resolve, reject) => {
        client.on('error', resolve);
        client.on('open', resolve);
      });
    } while (client.readyState !== WebSocket.OPEN);
  };
  teardown(() => {
    children.forEach((child) => child.kill());
    children.length = 0;
  });

  test('WebSocket server on default port', () => {
    return Promise.race([run([]), connect(4382)]);
  });

  test('WebSocket server on custom port', () => {
    return Promise.race([run(['--port', '6543']), connect(6543)]);
  });

  test('rejects invalid port values: unspecified', () => {
    return invert(run(['--port']));
  });

  test('rejects invalid port values: non-numeric', () => {
    return invert(run(['--port', 'seven']));
  });

  test('rejects invalid port values: negative', () => {
    return invert(run(['--port', '-8000']));
  });

  test('rejects invalid port values: non-integer', () => {
    return invert(run(['--port', '2004.3']));
  });

  test('rejects invalid port values: non-decimal', () => {
    return invert(run(['--port', '0x1000']));
  });
});
