/// <reference path="../types.d.ts" />

'use strict';

const { runScript, renderScript, parseCodePoints } = require('../../helpers/macos/applescript');

/** @type {ATDriverModules.InteractionPressKeys} */
async function pressKeys(websocket, { keys }) {
  await runScript(renderScript(parseCodePoints(keys)));
  return {};
}

/** @type {ATDriverModules.Interaction} */
module.exports = { 'interaction.pressKeys': pressKeys };
