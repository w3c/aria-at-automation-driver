'use strict';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const createCommandServer = require('./create-command-server');
const createVoiceServer = require('./create-voice-server');
const NAMED_PIPE = '\\\\?\\pipe\\my_pipe';
const DEFAULT_PORT = 4382;
const DEFAULT_AT_PORT = process.env.NVDA_CONFIGURATION_SERVER_PORT ||
  require('./shared/default-at-configuration-port.json');

/**
 * Print logging information to the process's standard error stream, annotated
 * with a timestamp describing the moment that the message was emitted.
 */
const log = (...args) => console.error(new Date().toISOString(), ...args);

/**
 * Generate configuration for the "yargs" Node.js module to describe a
 * command-line option for a TCP port.
 */
const portOptionConfig = (name) => {
  return {
    coerce(string) {
      if (!/^(0|[1-9][0-9]*)$/.test(string)) {
        throw new TypeError(
          `"${name}" option: expected a non-negative integer value but received "${string}"`
        );
      }
      return Number(string);
    },

    // Do not use the `number` type provided by `yargs` because it tolerates
    // JavaScript numeric literal forms which are likely typos in this context
    // (e.g. `0xf` or `1e-0`).
    type: 'string',
  };
};

module.exports = async (process) => {
  const argv = yargs(hideBin(process.argv))
    .option('port', {
      ...portOptionConfig('port'),
      default: DEFAULT_PORT,
      describe: 'TCP port on which to listen for WebSocket connections',
      requiresArg: true,
    })
    .option('at-port', {
      ...portOptionConfig('at-port'),
      default: DEFAULT_AT_PORT,
      describe: 'TCP port on which to send commands to configure assistive technology',
    })
    .parse();

  const [commandServer, voiceServer] = await Promise.all([
    createCommandServer(argv.port, argv.atPort),
    createVoiceServer(NAMED_PIPE),
  ]);

  log(`listening on port ${argv.port}`);

  commandServer.on('error', (error) => {
    log(`error: ${error}`);
  });

  voiceServer.on('message', (message) => {
    log(`sending message ${JSON.stringify(message)}`);

    commandServer.broadcast(message);
  });
};
