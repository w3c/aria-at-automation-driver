/// <reference path="../types.js" />

'use strict';

const child_process = require('child_process');

const { v4: uuid } = require('uuid');

/**
 * @returns {Promise<string>}
 */
const getMacOSVersion = async () => {
  return new Promise((resolve, reject) => {
    child_process.exec('sw_vers -productVersion', (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr));
        return;
      }
      resolve(stdout.trim());
    });
  });
};

const newSession = /** @type {ATDriverModules.SessionNewSession} */ (
  async (websocket, params) => {
    // TODO: match requested capabilities
    // const { capabilities } = params;
    websocket.sessionId = uuid();

    return {
      sessionId: websocket.sessionId,
      capabilities: {
        atName: 'Voiceover',
        // The ARIA-AT Community Group considers the MacOS version identifier
        // to be an accurate identifier for the VoiceOver screen reader.
        atVersion: await getMacOSVersion(),
        platformName: 'macos',
      },
    };
  }
);

module.exports = /** @type {ATDriverModules.Session} */ ({
  'session.new': newSession,
});
