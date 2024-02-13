/** @typedef {any} ATDriverModules.WebSocket */

/**
 * @typedef {function(ATDriverModules.WebSocket, Params): Promise<Response>} ATDriverModules.AsyncCommand
 * @template Params
 * @template Response
 */

/**
 * @typedef {function(ATDriverModules.WebSocket, Params): Response} ATDriverModules.SyncCommand
 * @template Params
 * @template Response
 */

/**
 * @typedef {ATDriverModules.AsyncCommand<Params, Response> | ATDriverModules.SyncCommand<Params, Response>} ATDriverModules.Command
 * @template Params
 * @template Response
 */

/**
 * @typedef {string[]} ATDriverModules.InteractionPressKeysKeyCombination
 */

/**
 * @typedef ATDriverModules.InteractionPressKeysParameters
 * @property {ATDriverModules.InteractionPressKeysKeyCombination} keys
 */

/**
 * @typedef {ATDriverModules.Command<ATDriverModules.InteractionPressKeysParameters, {}>} ATDriverModules.InteractionPressKeys
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
