/// <reference path="./types.js" />

'use strict';

const KeyCodeCommandKind = (exports.KeyCodeCommandKind = 'Applescript.AppleKeyCodeCommand');

/**
 * @param {Applescript.KeyCodeName[]} keyCodes
 * @param {Applescript.ModifierName[]} modifiers
 * @returns {Applescript.AppleKeyCodeCommand}
 */
exports.keyCodeCommand = function (keyCodes, modifiers) {
  return {
    kind: KeyCodeCommandKind,
    keyCodes,
    modifiers,
  };
};
