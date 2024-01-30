/// <reference path="../types.d.ts" />

'use strict';
const { v4: uuid } = require('uuid');

/** @type {ATDriverModules.SessionNewSession} */
const newSession = (websocket, params) => {
  // TODO: match requested capabilities
  // const { capabilities } = params;
  websocket.sessionId = uuid();
  return {
    sessionId: websocket.sessionId,
    capabilities: {
      atName: 'TODO',
      atVersion: 'TODO',
      platformName: 'win32',
    },
  };
};

/** @type {ATDriverModules.Session} */
module.exports = {
  'session.new': newSession,
};
