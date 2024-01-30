'use strict';

const { execFile } = require('child_process');

/**
 * Transform at-driver/webdriver code points into an applescript and run it.
 * KeyCombination -> AppleKeyCodeCommand -> Applescript -> runScript
 * @file
 */

const APPLESCRIPT_RETRY = 3;
const APPLESCRIPT_TIMEOUT = 5;
const APPLESCRIPT_TIMEOUT_ERROR = 'AppleEvent timed out';

/**
 * Map of key names to Apple System Events key codes.
 * @enum {number}
 * - https://eastmanreference.com/complete-list-of-applescript-key-codes
 * - https://github.com/guidepup/guidepup/blob/main/src/macOS/KeyCodes.ts
 * - https://manytricks.com/keycodes/
 */
const KeyCode = {
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  h: 4,
  g: 5,
  z: 6,
  x: 7,
  c: 8,
  v: 9,
  b: 11,
  q: 12,
  w: 13,
  e: 14,
  r: 15,
  y: 16,
  t: 17,
  1: 18,
  2: 19,
  3: 20,
  4: 21,
  6: 22,
  5: 23,
  equal: 24,
  9: 25,
  7: 26,
  minus: 27,
  8: 28,
  0: 29,
  squareRight: 30,
  o: 31,
  u: 32,
  squareLeft: 33,
  i: 34,
  p: 35,
  return: 36,
  l: 37,
  j: 38,
  quote: 39,
  k: 40,
  semicolon: 41,
  backslash: 42,
  comma: 43,
  slash: 44,
  n: 45,
  m: 46,
  period: 47,
  tab: 48,
  space: 49,
  backtick: 50,
  backspace: 51,
  escape: 53,
  command: 55,
  shift: 57,
  option: 58,
  control: 59,
  fn: 63,
  numpadDecimal: 65,
  numpadMultiply: 67,
  numpadAdd: 69,
  numpadClear: 71,
  numpadDivide: 75,
  numpadSubtract: 78,
  numpadEqual: 81,
  numpad0: 82,
  numpad1: 83,
  numpad2: 84,
  numpad3: 85,
  numpad4: 86,
  numpad5: 87,
  numpad6: 88,
  numpad7: 89,
  numpad8: 91,
  numpad9: 92,
  f5: 96,
  f6: 97,
  f7: 98,
  f3: 99,
  f8: 100,
  f9: 101,
  f11: 103,
  f10: 109,
  f12: 111,
  help: 114,
  home: 115,
  pageUp: 116,
  delete: 117,
  f4: 118,
  end: 119,
  f2: 120,
  pageDown: 121,
  f1: 122,
  arrowLeft: 123,
  arrowRight: 124,
  arrowDown: 125,
  arrowUp: 126,
};

/** @typedef {keyof typeof KeyCode} KeyCodeName */

/**
 * Map of modifier key names to System Events modifier identifiers.
 * @enum {string}
 */
const Modifier = {
  command: 'command',
  control: 'control',
  fn: 'fn',
  option: 'option',
  shift: 'shift',
};

/** @typedef {keyof typeof Modifier} ModifierName */

/**
 * @typedef AppleKeyCodeCommand
 * @property {string} kind
 * @property {KeyCodeName[]} keyCodes
 * @property {ModifierName[]} modifiers
 */

/**
 * @param {KeyCodeName[]} keyCodes
 * @param {ModifierName[]} modifiers
 * @returns {AppleKeyCodeCommand}
 */
const keyCodeCommand = (exports.keyCodeCommand = function (keyCodes, modifiers) {
  return {
    kind: 'AppleKeyCodeCommand',
    keyCodes,
    modifiers,
  };
});

/**
 * @enum {string}
 */
// Commented out keys have known mapping in System Events.
const KeyboardAction = {
  // '\ue000': 'unidentified'
  // '\ue001': 'cancel',
  '\ue002': 'help',
  '\ue003': 'backspace',
  '\ue004': 'tab',
  // '\ue005': 'clear',
  '\ue006': 'return',
  '\ue007': 'enter',
  '\ue008': 'shift',
  '\ue009': 'control',
  '\ue00a': 'option',
  '\ue00b': 'pause',
  '\ue00c': 'escape',
  '\ue00d': 'space',
  '\ue00e': 'pageUp',
  '\ue00f': 'pageDown',
  '\ue010': 'end',
  '\ue011': 'home',
  '\ue012': 'arrowLeft',
  '\ue013': 'arrowUp',
  '\ue014': 'arrowRight',
  '\ue015': 'arrowDown',
  // '\ue016': 'insert',
  '\ue017': 'delete',
  '\ue018': 'semicolon',
  '\ue019': 'equal',

  '\ue01a': 'numpad0',
  '\ue01b': 'numpad1',
  '\ue01c': 'numpad2',
  '\ue01d': 'numpad3',
  '\ue01e': 'numpad4',
  '\ue01f': 'numpad5',
  '\ue020': 'numpad6',
  '\ue021': 'numpad7',
  '\ue022': 'numpad8',
  '\ue023': 'numpad9',

  '\ue024': 'numpadMultiply',
  '\ue025': 'numpadAdd',
  // '\ue026': 'separator',
  '\ue027': 'numpadSubtract',
  '\ue028': 'numpadDecimal',
  '\ue029': 'numpadDivide',

  '\ue031': 'f1',
  '\ue032': 'f2',
  '\ue033': 'f3',
  '\ue034': 'f4',
  '\ue035': 'f5',
  '\ue036': 'f6',
  '\ue037': 'f7',
  '\ue038': 'f8',
  '\ue039': 'f9',
  '\ue03a': 'f10',
  '\ue03b': 'f11',
  '\ue03c': 'f12',

  '\ue03d': 'command',
  '\ue040': 'backtick',

  '\b': 'backspace',
  '\t': 'tab',
  ' ': 'space',
};

/**
 * Parse at-driver/webdriver key code points into a AppleKeyCodeCommand.
 * @param {ATDriverModules.InteractionPressKeysKeyCombination} codes
 * @returns {AppleKeyCodeCommand}
 * @throws
 */
exports.parseCodePoints = function (codes) {
  /** @type {KeyCodeName[]} */
  const keyCodes = [];
  /** @type {ModifierName[]} */
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

/**
 * A command that can be rendered to applescript.
 * @typedef {AppleKeyCodeCommand} ApplescriptCommand
 */

/**
 * A rendered applescript from a command.
 * @typedef Applescript
 * @property {string} kind
 * @property {string} script
 */

/**
 * Create an Applescript object.
 * @param {string} script
 * @returns {Applescript}
 */
const applescript = (exports.applescript = function (script) {
  return {
    kind: 'Applescript',
    script,
  };
});

/**
 * Validate that command can be rendered to Applescript.
 * @param {ApplescriptCommand} command
 * @throws
 */
const validateCommand = (exports.validateCommand = function (command) {
  if (command.kind === 'AppleKeyCodeCommand') {
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
});

/**
 * Render a command into an Applescript.
 * @param {ApplescriptCommand} command
 * @returns {Applescript}
 * @throws
 */
exports.renderScript = function (command) {
  validateCommand(command);
  const script = `with timeout of ${APPLESCRIPT_TIMEOUT} seconds
    tell application "System Events"${command.keyCodes
      .map(
        code => `
        key code ${KeyCode[code].toString()}${
          command.modifiers.length > 1
            ? ` using {${command.modifiers.map(mod => `${Modifier[mod]} down`).join(', ')}}`
            : command.modifiers.length === 1
              ? ` using ${Modifier[command.modifiers[0]]} down`
              : ``
        }`,
      )
      .join('')}
    end tell
end timeout`;
  return applescript(script);
};

/**
 * @param {Applescript} script
 * @returns {Promise<string | void>}
 * @throws
 */
const execScript = (exports.execScript = async function (script) {
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/osascript', [], {}, (e, stdout) => {
      if (e) {
        return reject(e);
      }

      if (!stdout) {
        resolve();
      } else {
        resolve(stdout);
      }
    });

    child.stdin.write(script.script);
    child.stdin.end();
  });
});

/**
 * @param {function(): Promise<T> | T} action
 * @returns {Promise<T>}
 * @throws
 * @template T
 */
const retryOnTimeout = (exports.retryOnTimeout = async function (action) {
  for (let i = 0; i < APPLESCRIPT_RETRY; i++) {
    try {
      return await action();
    } catch (error) {
      if (!error || !error.message || !error.message.includes(APPLESCRIPT_TIMEOUT_ERROR)) {
        throw error;
      }
    }
  }
});

/**
 * @param {Applescript} script
 * @returns {Promise<string | void>}
 * @throws
 */
exports.runScript = async script => {
  return await retryOnTimeout(async () => await execScript(script));
};
