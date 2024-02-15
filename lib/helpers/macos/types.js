/**
 * @namespace Applescript
 */

/**
 * @typedef {string} Applescript.KeyCodeName
 */

/**
 * @typedef {string} Applescript.ModifierName
 */

/**
 * @typedef Applescript.AppleKeyCodeCommand
 * @property {string} kind
 * @property {Applescript.KeyCodeName[]} keyCodes
 * @property {Applescript.ModifierName[]} modifiers
 */

/**
 * A command that can be rendered to applescript.
 * @typedef {Applescript.AppleKeyCodeCommand} Applescript.Command
 */

/**
 * A rendered applescript from a command.
 * @typedef Applescript.Script
 * @property {string} kind
 * @property {string} source
 */
