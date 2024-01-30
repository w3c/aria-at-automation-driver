/// <reference path="../../modules/types.d.ts" />
/// <reference path="./applescript.js" />

'use strict';

const { KeyboardAction, Modifier, KeyCode, } = require('./applescript');
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
        throw new Error(`unknown action (\\u${code.charCodeAt(0).toString(16)})`);
      }
    } else if (code in KeyCode) {
      keyCodes.push(code);
    } else {
      throw new Error(`unknown key (\\u${code.charCodeAt(0).toString(16)})`);
    }
  }
  return keyCodeCommand(keyCodes, modifiers);
};
