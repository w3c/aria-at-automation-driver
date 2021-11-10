'use strict';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const createWebSocketServer = require('./create-websocket-server');
const createVoiceServer = require('./create-voice-server');
const NAMED_PIPE = '\\\\?\\pipe\\my_pipe';
const DEFAULT_PORT = 4382;

/**
 * Print logging information to the process's standard error stream, annotated
 * with a timestamp describing the moment that the message was emitted.
 */
const log = (...args) => console.error(new Date().toISOString(), ...args);

module.exports = async (process) => {
  const argv = yargs(hideBin(process.argv))
    .option('port', {
      coerce(string) {
        if (!/^(0|[1-9][0-9]*)$/.test(string)) {
          throw new TypeError(
            `"port" option: expected a non-negative integer value but received "${string}"`
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
    })
    .parse();

  const [websocketServer, tcpServer] = await Promise.all([
    createWebSocketServer(argv.port),
    createVoiceServer(NAMED_PIPE),
  ]);

  log(`listening on port ${argv.port}`);

  tcpServer.on('connection', (socket) => {
    let emitted = '';
    socket.on('data', (buffer) => emitted += buffer.toString());
    socket.on('end', () => {
      const match = emitted.match(/^(lifecycle|speech|internalError):(.*)$/);
      const [name, data] = match ?
        [match[1], match[2]] :
        ['internalError', `unrecognized message: "${emitted}"`];
      const message = { type: 'event', name, data };

      log(`sending message ${JSON.stringify(message)}`);

      websocketServer.clients.forEach((client) => {
        client.send(
          message,
          (error) => {
            if (error) {
              log(`error sending message: ${error}`);
            }
          }
        );
      });
    });
  });
};
