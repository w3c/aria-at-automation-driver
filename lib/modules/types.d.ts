namespace ATDriverModules {
  type WebSocket = any;

  interface Command<Params, Response> {
    (websocket: WebSocket, parameters: Params): Promise<Response> | Response;
  }

  type InteractionPressKeysKeyCombination = string[];

  type InteractionPressKeysParameters = {
    keys: InteractionPressKeysKeyCombination;
  };

  type InteractionPressKeysResponse = {};

  type InteractionPressKeys = Command<InteractionPressKeysParameters, InteractionPressKeysResponse>;

  interface Interaction {
    'interaction.pressKeys': InteractionPressKeys;
  }

  interface SessionNewSessionResponse {
    sessionId: string;
    capabilities: {
      atName: string;
      atVersion: string;
      platformName: string;
    };
  }

  type SessionNewSession = Command<{}, SessionNewSessionResponse>;

  interface Session {
    'session.new': SessionNewSession;
  }
}
