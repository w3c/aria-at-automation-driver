'use strict';

const net = require('net');

const onConnection = (server, socket) => {
  let emitted = '';
  socket.on('data', (buffer) => emitted += buffer.toString());
  socket.on('end', () => {
    const match = emitted.match(/^(lifecycle|speech|internalError):(.*)$/);
    const [name, data] = match ?
      [match[1], match[2]] :
      ['internalError', `unrecognized message: "${emitted}"`];

    server.emit('message', { type: 'event', name, data });
  });
};

/**
 * Create a server which communicates with this project's Microsoft SAPI voice
 * via TCP and emits "message" events describing the information which flows
 * from that component.
 *
 * @param {string} handle - the address at which the server should listen for
 *                          connections
 *
 * @returns {Promise<EventEmitter>} an eventual value which is fulfilled when
 *                                  the server has established a connection
 *                                  with the SAPI voice
 */
module.exports = function createVoiceServer(handle) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(handle, () => resolve(server));
    server.on('error', reject);

    server.on('connection', onConnection.bind(null, server));
  });
};
