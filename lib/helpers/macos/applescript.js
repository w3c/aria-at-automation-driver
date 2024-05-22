/// <reference path="./types.js" />

'use strict';

const { execFile } = require('child_process');

const { KeyboardAction } = require('./KeyboardAction');
const { KeyCode } = require('./KeyCode');
const { Modifier } = require('./Modifier');
const { validateCommand } = require('./validateCommand');

/**
 * Transform at-driver/webdriver code points into an applescript and run it.
 * KeyCombination -> AppleKeyCodeCommand -> Applescript -> runScript
 * @file
 */

/** How many times Applescripts try to retry if it timed out. */
const APPLESCRIPT_RETRY = 3;
/** After how many seconds will an Applescript time out. */
const APPLESCRIPT_TIMEOUT = 5;
/** Error message to look for to determine error is an Applescript time out. */
const APPLESCRIPT_TIMEOUT_ERROR = (exports.APPLESCRIPT_TIMEOUT_ERROR = 'AppleEvent timed out');

exports.KeyboardAction = KeyboardAction;

exports.KeyCode = KeyCode;

exports.Modifier = Modifier;

const ScriptKind = (exports.ScriptKind = 'Applescript.Script');

/**
 * Create an Applescript object.
 * @param {string} source
 * @returns {Applescript.Script}
 */
const applescript = (exports.applescript = function (source) {
  return {
    kind: ScriptKind,
    source,
  };
});

const INDENT = '    ';

/**
 * Render a command into an Applescript.
 * @param {Applescript.Command} command
 * @returns {Applescript.Script}
 * @throws
 */
exports.renderScript = function (command) {
  validateCommand(command);
  // Key presses must be scripted as a nested series of "key down"/"key up"
  // commands rather than a linear sequence of "key code" commands because
  // VoiceOver does not recognize key combinations using the latter API (e.g.
  // `key code {123, 124}`).
  const renderedKeyCodeLines = [...command.modifiers, ...command.keyCodes]
    .reverse()
    .map(code => KeyCode[code].toString())
    .reduce((accum, next) => `key down ${next}\n${accum}\nkey up ${next}`, '')
    .split('\n')
    .map(line => `${INDENT}${INDENT}${line}`)
    .join('\n');

  const script = `with timeout of ${APPLESCRIPT_TIMEOUT} seconds
${INDENT}tell application "System Events"
${renderedKeyCodeLines}
${INDENT}end tell
end timeout`;

  return applescript(script);
};

/**
 * @param {Applescript.Script} script
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

    if (!child.stdin) {
      throw new Error('Missing stdin pipe');
    }

    child.stdin.write(script.source);
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
  let error;

  for (let i = 0; i < APPLESCRIPT_RETRY; i++) {
    try {
      return await action();
    } catch (e) {
      error = e;
      if (!error || !error.message || !error.message.includes(APPLESCRIPT_TIMEOUT_ERROR)) {
        throw error;
      }
    }
  }

  throw error;
});

/**
 * @param {Applescript.Script} script
 * @returns {Promise<string | void>}
 * @throws
 */
exports.runScript = async script => {
  return await retryOnTimeout(async () => await execScript(script));
};
