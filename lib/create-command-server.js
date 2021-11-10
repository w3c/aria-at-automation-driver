'use strict';
const { WebSocketServer } = require('ws');
const SUB_PROTOCOL = 'v1.aria-at.bocoup.com';

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

  server.broadcast = (message) => {
    server.clients.forEach((client) => {
      client.send(
        message,
        (error) => {
          if (error) {
            server.emit('error', `error sending message: ${error}`);
          }
        }
      );
    });
  };

  return server;
};
