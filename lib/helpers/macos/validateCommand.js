/// <reference path="./types.js" />

'use strict';

const { KeyCode } = require('./KeyCode');
const { Modifier } = require('./Modifier');
const { KeyCodeCommandKind } = require('./keyCodeCommand');

/**
 * Validate that command can be rendered to Applescript.
 * @param {Applescript.Command} command
 * @throws
 */
exports.validateCommand = function (command) {
  if (command.kind === KeyCodeCommandKind) {
    for (const code of command.keyCodes) {
      if (!(code in KeyCode)) {
        throw new Error(`unknown code "${code}"`);
      }
    }
    for (const mod of command.modifiers) {
      if (!(mod in Modifier)) {
        throw new Error(`unknown modifier "${mod}"`);
      }
    }
  } else {
    throw new Error(`unknown applescript command "${command.kind}"`);
  }
};
