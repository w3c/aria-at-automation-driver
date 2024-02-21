/// <reference path="../types.js" />

'use strict';

const { runScript, renderScript } = require('../../helpers/macos/applescript');
const { parseCodePoints } = require('../../helpers/macos/parseCodePoints');

const pressKeys = /** @type {ATDriverModules.InteractionPressKeys} */ (
  async function (websocket, { keys }) {
    await runScript(renderScript(parseCodePoints(keys)));
    return {};
  }
);

module.exports = /** @type {ATDriverModules.Interaction} */ ({
  'interaction.pressKeys': pressKeys,
});
