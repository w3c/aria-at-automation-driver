/// <reference path="../types.js" />

'use strict';

const { v4: uuid } = require('uuid');

const newSession = /** @type {ATDriverModules.SessionNewSession} */ (
  (websocket, params) => {
    // TODO: match requested capabilities
    // const { capabilities } = params;
    websocket.sessionId = uuid();
    return {
      sessionId: websocket.sessionId,
      capabilities: {
        atName: 'Voiceover',
        atVersion: 'TODO',
        platformName: 'macos',
      },
    };
  }
);

module.exports = /** @type {ATDriverModules.Session} */ ({
  'session.new': newSession,
});
