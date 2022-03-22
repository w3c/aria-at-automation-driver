'use strict';
const { WebSocketServer } = require('ws');
const robotjs = require('../vendor/robotjs.node');

const SUB_PROTOCOL = 'v1.aria-at.bocoup.com';

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

const onConnection = (websocket) => {
  const send = (value) => websocket.send(JSON.stringify(value));

  websocket.on('message', (data) => {
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
    verifyClient({req}) {
      return req.headers['sec-websocket-protocol'] === SUB_PROTOCOL;
    },
    port,
  });
  await new Promise((resolve) => server.once('listening', resolve));

  server.broadcast = broadcast.bind(null, server);
  server.on('connection', onConnection);

  return server;
};
