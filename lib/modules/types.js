// namespace ATDriverModules {
//     type WebSocket = any;

//     interface Command<Params, Response> {
//     (websocket: WebSocket, parameters: Params): Promise<Response> | Response;
//     }

//     type InteractionPressKeysKeyCombination = string[];

//     type InteractionPressKeysParameters = {
//     keys: InteractionPressKeysKeyCombination;
//     };

//     type InteractionPressKeysResponse = {};

//     type InteractionPressKeys = Command<InteractionPressKeysParameters, InteractionPressKeysResponse>;

//     interface Interaction {
//     'interaction.pressKeys': InteractionPressKeys;
//     }

//     interface SessionNewSessionResponse {
//     sessionId: string;
//     capabilities: {
//         atName: string;
//         atVersion: string;
//         platformName: string;
//     };
//     }

//     type SessionNewSession = Command<{}, SessionNewSessionResponse>;

//     interface Session {
//     'session.new': SessionNewSession;
//     }
// }

/** @typedef {any} ATDriverModules.WebSocket */

/**
 * @typedef {function(ATDriverModules.WebSocket, Params): Promise<Response> | Response} ATDriverModules.Command
 * @template Params
 * @template Response
 */

/**
 * @typedef {string[]} ATDriverModules.InteractionPressKeysKeyCombination
 */

/**
 * @typedef InteractionPressKeysParameters
 * @property {InteractionPressKeysKeyCombination} keys
 */

/**
 * @typedef {ATDriverModules.Command<InteractionPressKeysParameters, {}>} ATDriverModules.InteractionPressKeys
 */

/**
 * @typedef {{
 *   "interaction.pressKeys": ATDriverModules.InteractionPressKeys
 * }} ATDriverModules.Interaction
 */

/**
 * @typedef ATDriverModules.SessionNewSessionResponse
 * @property {string} sessionId
 * @property {object} capabilities
 * @property {string} capabilities.atName
 * @property {string} capabilities.atVersion
 * @property {string} capabilities.platformName
 */

/**
 * @typedef {ATDriverModules.Command<{}, ATDriverModules.SessionNewSessionResponse>} ATDriverModules.SessionNewSession
 */

/**
 * @typedef {{
 *   "session.new": ATDriverModules.SessionNewSession,
 * }} ATDriverModules.Session
 */

//     interface Command<Params, Response> {
//     (websocket: WebSocket, parameters: Params): Promise<Response> | Response;
//     }
