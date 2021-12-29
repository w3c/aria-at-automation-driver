'use strict';
const http = require('http');

/**
 * Transmit JSON-formatted UTF-8 encoded data via an HTTP POST request.
 *
 * @param {number} port - the TCP port on which to send the data
 * @param {object} body - the data to send
 */
module.exports = function postJSON(port, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const request = http.request(
      {
        hostname: 'localhost',
        method: 'POST',
        port,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf-8');
        response.on('data', (chunk) => responseBody += chunk);
        response.on('end', () => {
          if (!response.complete) {
            reject(new Error('HTTP response interrupted'));
            return;
          }

          if (response.statusCode >= 300) {
            reject(new Error(responseBody));
            return;
          }

          resolve();
        });
      }
    );

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
};
