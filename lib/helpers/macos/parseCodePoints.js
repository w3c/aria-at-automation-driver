/// <reference path="../../modules/types.js" />
/// <reference path="./applescript.js" />

'use strict';

const { KeyboardAction, Modifier, KeyCode } = require('./applescript');
const { keyCodeCommand } = require('./keyCodeCommand');

/**
 * Parse at-driver/webdriver key code points into a AppleKeyCodeCommand.
 * @param {ATDriverModules.InteractionPressKeysKeyCombination} codes
 * @returns {Applescript.AppleKeyCodeCommand}
 * @throws
 */
exports.parseCodePoints = function (codes) {
  /** @type {Applescript.KeyCodeName[]} */
  const keyCodes = [];
  /** @type {Applescript.ModifierName[]} */
  const modifiers = [];
  for (const code of codes) {
    const action = KeyboardAction[code];
    if (action) {
      if (action in Modifier) {
        modifiers.push(action);
      } else if (action in KeyCode) {
        keyCodes.push(action);
      } else {
        throw new Error(`unknown action (${code.charCodeAt(0).toString(16)})`);
      }
    } else if (code in KeyCode) {
      keyCodes.push(code);
    } else if (code.length === 1) {
      throw new Error(`unknown key (\\u${code.charCodeAt(0).toString(16)})`);
    } else {
      // Matches an error thrown by robotjs.
      throw new Error('Invalid key code specified.');
    }
  }
  return keyCodeCommand(keyCodes, modifiers);
};
