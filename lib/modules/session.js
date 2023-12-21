'use strict';
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

module.exports = {
  'session.new': newSession,
};
