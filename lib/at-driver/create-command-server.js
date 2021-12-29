'use strict';
const { WebSocketServer } = require('ws');
const robotjs = require('robotjs');

const postJSON = require('./post-json');
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

const onConnection = (atPort, websocket) => {
  const send = (value) => websocket.send(JSON.stringify(value));

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
        await postJSON(atPort, parsed.params[0]);
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
 * @param {number} atPort - the TCP port on which the server should send
 *                          messages to modify screen reader configuration
 *
 * @returns {Promise<EventEmitter>} an eventual value which is fulfilled when
 *                                  the server has successfully bound to the
 *                                  requested port
 */
module.exports = async function createWebSocketServer(port, atPort) {
  const server = new WebSocketServer({
    clientTracking: true,
    verifyClient({req}) {
      return req.headers['sec-websocket-protocol'] === SUB_PROTOCOL;
    },
    port,
  });
  await new Promise((resolve) => server.once('listening', resolve));

  server.broadcast = broadcast.bind(null, server);
  server.on('connection', onConnection.bind(null, atPort));

  return server;
};
