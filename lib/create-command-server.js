'use strict';
const { WebSocketServer } = require('ws');
const { v4: uuid } = require('uuid');
const robotjs = require('robotjs');

const broadcast = (server, message) => {
  const packedMessage = JSON.stringify(message);
  server.clients.forEach((websocket) => {
    if (websocket.sessionId) {
      websocket.send(
        packedMessage,
        (error) => {
          if (error) {
            server.emit('error', `error sending message: ${error}`);
          }
        }
      );  
    }
  });
};

const newSession = (websocket, params) => {
  // TODO: match requested capabilities
  // const { capabilities } = params;
  websocket.sessionId = uuid();
  return {
    sessionId: websocket.sessionId,
    capabilities: {
      atName: 'TODO',
      atVersion: 'TODO',
      platformName: 'TODO',
    },
  };
};

const pressKeys = (websocket, {keys}) => {
  // TODO: Convert from webdriver keys to robotjs keys.
  robotjs.keyTap(keys[0]);
  return {};
};

const methodHandlers = {
  'session.new': newSession,
  'interaction.pressKeys': pressKeys,
};

const onConnection = (websocket) => {
  const send = (value) => websocket.send(JSON.stringify(value));

  websocket.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch ({}) {
      send({id: null, error: 'unknown error', message: `Unable to parse message: "${data}".`});
      return;
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      send({id: null, error: 'unknown error', message: `Malformed message: "${data}".`});
      return;
    }

    if (!parsed.method) {
      send({id: null, error: 'unknown command', message: `Unrecognized message type (no method): "${data}".`});
      return;
    }

    const {id, params} = parsed;
    if (typeof id !== 'number') {
      send({id: null, error: 'unknown error', message: `Command missing required "id": "${data}".`});
      return;
    }

    try {
      const handler = methodHandlers[parsed.method];
      if (!handler) {
        return send({id, error: 'unknown command'});
      }
      const result = handler(websocket, params);
      send({id, result});
    } catch (error) {
      send({id, error: 'unknown error', message: error.message});
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
    path: '/session',
    port,
  });
  await new Promise((resolve) => server.once('listening', resolve));

  server.broadcast = broadcast.bind(null, server);
  server.on('connection', onConnection);

  return server;
};
