/// <reference path="../types.js" />

'use strict';

const { runScript, renderScript } = require('../../helpers/macos/applescript');
const { parseCodePoints } = require('../../helpers/macos/parseCodePoints');

/** @type {ATDriverModules.InteractionPressKeys} */
async function pressKeys(websocket, { keys }) {
  await runScript(renderScript(parseCodePoints(keys)));
  return {};
}

/** @type {ATDriverModules.Interaction} */
module.exports = { 'interaction.pressKeys': pressKeys };
