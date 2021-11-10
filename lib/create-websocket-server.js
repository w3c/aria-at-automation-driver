'use strict';
const { WebSocketServer } = require('ws');
const SUB_PROTOCOL = 'v1.aria-at.bocoup.com';

/**
 * Create a WebSocket server
 *
 * @param {number} port - the port on which the server should listen for new connections
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
  return server;
};
