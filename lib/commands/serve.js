'use strict';

const fs = require('fs/promises');

const createCommandServer = require('../create-command-server');
const createVoiceServer = require('../create-voice-server');

const WINDOWS_NAMED_PIPE = '\\\\?\\pipe\\my_pipe';
const MACOS_SYSTEM_DIR = '/usr/local/var/at_driver_generic';
const MACOS_SOCKET_UNIX_PATH = '/usr/local/var/at_driver_generic/driver.socket';
const DEFAULT_PORT = 4382;

/**
 * Print logging information to the process's standard error stream, annotated
 * with a timestamp describing the moment that the message was emitted.
 */
const log = (...args) => console.error(new Date().toISOString(), ...args);

const prepareSocketPath = async () => {
  if (process.platform === 'win32') {
    return WINDOWS_NAMED_PIPE;
  } else if (process.platform === 'darwin') {
    await fs.mkdir(MACOS_SYSTEM_DIR, { recursive: true });
    await fs.unlink(MACOS_SOCKET_UNIX_PATH).catch(error => {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    });
    return MACOS_SOCKET_UNIX_PATH;
  }
  throw new Error(`unsupported host platform '${process.platform}'`);
};

module.exports = /** @type {import('yargs').CommandModule} */ ({
  command: 'serve',
  describe: 'Run at-driver server',
  builder(yargs) {
    return yargs.option('port', {
      coerce(string) {
        if (!/^(0|[1-9][0-9]*)$/.test(string)) {
          throw new TypeError(
            `"port" option: expected a non-negative integer value but received "${string}"`,
          );
        }
        return Number(string);
      },
      default: DEFAULT_PORT,
      describe: 'TCP port on which to listen for WebSocket connections',
      // Do not use the `number` type provided by `yargs` because it tolerates
      // JavaScript numeric literal forms which are likely typos in this
      // context (e.g. `0xf` or `1e-0`).
      type: 'string',
      requiresArg: true,
    });
  },
  async handler(argv) {
    const socketPath = await prepareSocketPath();

    const [commandServer, voiceServer] = await Promise.all([
      createCommandServer(argv.port),
      createVoiceServer(socketPath),
    ]);

    log(`listening on port ${argv.port}`);

    commandServer.on('error', error => {
      log(`error: ${error}`);
    });

    voiceServer.on('message', message => {
      log(`voice server received message ${JSON.stringify(message)}`);
      if (message.name == 'speech') {
        commandServer.broadcast({
          method: 'interaction.capturedOutput',
          params: { data: message.data },
        });
      }
    });

    voiceServer.on('error', error => {
      log(`error: ${error}`);
    });
  },
});
