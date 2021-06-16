'use strict';
const EventEmitter = require('events');
const path = require('path');
const net = require('net');

const {Builder} = require('selenium-webdriver');
const debug = require('debug')('aria-at-demo');
require('geckodriver');

const commonCommands = require('./commands/common');
const atCommands = {
  nvda: './commands/at-nvda',
  narrator: './commands/at-narrator',
};

const createListener = (address) => {
  const emitter = new EventEmitter();
  const server = net.createServer((stream) => {
    stream.on('data', (buffer) => {
      const normalized = buffer.toString()
        .trim()
        .replace(/  +/g, ' ');

      emitter.emit('speech', normalized);
    });
  });
  const listener = {
    next() {
      return new Promise((resolve, reject) => {
        const onSpeech = (text) => {
          resolve(text);
          emitter.off('destroy', onDestroy);
        };
        const onDestroy = () => {
          reject('Listener destroyed while waiting for speech');
          emitter.off('speech', onSpeech);
        };
        emitter.once('speech', onSpeech);
        emitter.once('destroy', onDestroy);
      });
    },
    destroy() {
      emitter.emit('destroy');
      emitter.removeAllListeners();

      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  };

  return new Promise((resolve, reject) => {
    server.listen(address, () => resolve(listener));
    server.on('error', reject);
  });
};

(async () => {
  const address = '\\\\?\\pipe\\my_pipe';
  const ariaAtDir = path.resolve(__dirname,'..', 'w3c-aria-at');

  if (process.argv.length !== 3) {
    throw new Error('AT name must be provided as a command-line argument.');
  }

  const atName = process.argv[2];

  if (!(atName in atCommands)) {
    throw new Error(`Unrecognized AT name: "${atName}"`);
  }
  const commands = {
    ...commonCommands,
    ...require(atCommands[atName]),
  };
  const webdriver = await new Builder()
    .forBrowser('firefox')
    .build();
  const listener = await createListener(address);

  const test = require(path.join(
    ariaAtDir,
    'tests',
    'checkbox',
    'test-01-navigate-to-unchecked-checkbox-reading.nvda.json'
  ));

  try {
    let lastSpeech = '';

    for (const command of test) {
      const name = Object.keys(command)[0];
      const args = command[name];
      debug(JSON.stringify(command));
      lastSpeech = await commands[name]({
        args,
        ariaAtDir,
        lastSpeech,
        listener,
        webdriver,
      }) || lastSpeech;
    }
  } finally {
    await listener.destroy();
    await webdriver.quit();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
