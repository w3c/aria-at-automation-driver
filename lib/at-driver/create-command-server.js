'use strict';
const { WebSocketServer } = require('ws');
const robotjs = require('robotjs');

const postJSON = require('./post-json');
const DEFAULT_AT_PORT = process.env.NVDA_CONFIGURATION_SERVER_PORT ||
  require('../shared/default-at-configuration-port.json');
const SUB_PROTOCOL = 'v1.aria-at.bocoup.com';
const HTTP_UNPROCESSABLE_ENTITY = 422;
const supportedAts = ['nvda'];

const broadcast = (server, message) => {
  const packedMessage = JSON.stringify(message);
  server.clients.forEach((websocket) => {
    websocket.send(
      packedMessage,
      (error) => {
        if (error) {
          server.emit('error', `error sending message: ${error}`);
        }
      }
    );
  });
};

const onConnection = (websocket, request) => {
  const send = (value) => websocket.send(JSON.stringify(value));
  const {at, port} = validateRequest(request);

  websocket.on('message', async (data) => {
    let parsed;
    const type = 'response';
    try {
      parsed = JSON.parse(data);
    } catch ({}) {
      send({type, id: null, error: `Unable to parse message: "${data}".`});
      return;
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      send({type, id: null, error: `Malformed message: "${data}".`});
      return;
    }

    if (parsed.type !== 'command') {
      send({type, id: null, error: `Unrecognized message type: "${data}".`});
      return;
    }

    const {id} = parsed;
    if (typeof id !== 'number') {
      send({type, id: null, error: `Command missing required "id": "${data}".`});
      return;
    }

    try {
      if (parsed.name === 'pressKey') {
        robotjs.keyToggle(parsed.params[0], 'down');
      } else if (parsed.name === 'releaseKey') {
        robotjs.keyToggle(parsed.params[0], 'up');
      } else if (parsed.name === 'configure') {
        await postJSON(port, parsed.params[0]);
      } else {
        throw new Error(`Unrecognized command name: "${data}".`);
      }

      send({type, id, result: null});
    } catch (error) {
      send({type, id, error: error.message});
    }
  });
};

/**
 * Determine if the server can initiate a WebSocket session to satisfy a given
 * HTTP request.
 *
 * @param {http.IncomingMesssage} - an object representing an HTTP request
 *                                  which has been submitted as a "handshake"
 *                                  to initiate a WebSocket session
 * @returns {Error|object} if the request can be satisfied, an object defining
 *                         the requested assistive technology and TCP port if
 *                         the request can be satisfied; if the request cannot
 *                         be satisfied, an Error instance describing the
 *                         reason
 */
const validateRequest = (request) => {
  const subProtocol = request.headers['sec-websocket-protocol'];

  if (subProtocol !== SUB_PROTOCOL) {
    return new Error(`Unrecognized sub-protocol: ${subProtocol}"`);
  }

  const {searchParams} = new URL(request.url, `http://${request.headers.host}`);
  const at = searchParams.get('at');

  if (!at) {
    return new Error(
      'An assistive technology must be specified via the "at" URL query string parameter.'
    );
  }

  if (!supportedAts.includes(at)) {
    return new Error(`Unrecognized assistive technology: "${at}".`);
  }

  const port = searchParams.has('port') ?
    parseInt(searchParams.get('port'), 10) : DEFAULT_AT_PORT;

  if (Number.isNaN(port)) {
    return new Error(
      `Invalid value for "port" URL query string parameter: "${searchParams.get('port')}".`
    );
  }

  return {at, port};
};

/**
 * Create a server which communicates with external clients using the WebSocket
 * protocol described in the project README.md file.
 *
 * @param {number} port - the port on which the server should listen for new
 *                        connections
 *
 * @returns {Promise<EventEmitter>} an eventual value which is fulfilled when
 *                                  the server has successfully bound to the
 *                                  requested port
 */
module.exports = async function createWebSocketServer(port) {
  const server = new WebSocketServer({
    clientTracking: true,
    verifyClient({req}, done) {
      const result = validateRequest(req);
      if (result instanceof Error) {
        return done(false, HTTP_UNPROCESSABLE_ENTITY, result.message);
      }
      return done(true);
    },
    port,
  });
  await new Promise((resolve) => server.once('listening', resolve));

  server.broadcast = broadcast.bind(null, server);
  server.on('connection', onConnection);

  return server;
};
