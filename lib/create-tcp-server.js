'use strict';

const net = require('net');

/**
 * Create a TCP server
 *
 * @param {string} handle - the address at which the server should listen for connections
 */
module.exports = function createTcpServer(handle) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(handle, () => resolve(server));
    server.on('error', reject);
  });
};
