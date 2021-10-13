'use strict';

const { WebSocketServer } = require('ws');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const DEFAULT_PORT = 4382;

/**
 * Print logging information to the process's standard error stream, annotated
 * with a timestamp describing the moment that the message was emitted.
 */
const log = (...args) => console.error(new Date().toISOString(), ...args);
/**
 * Create a WebSocker server
 *
 * @param {number} port - the port on which the server should listen for new connections
 */
const createServer = (port) => {
  return new Promise((resolve) => {
    const server = new WebSocketServer({port}, () => resolve(server));
  });
};

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

  const server = await createServer(argv.port);

  log(`at-driver listening on port ${argv.port}`, server);
};
