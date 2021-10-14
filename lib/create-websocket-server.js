'use strict';
const { WebSocketServer } = require('ws');

/**
 * Create a WebSocket server
 *
 * @param {number} port - the port on which the server should listen for new connections
 */
module.exports = async function createWebSocketServer(port) {
  const server = new WebSocketServer({
    clientTracking: true,
    port,
  });
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
};
