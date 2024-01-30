/// <reference path="./types.js" />

'use strict';

const { execFile } = require('child_process');

const { KeyboardAction } = require('./KeyboardAction');
const { KeyCode } = require('./KeyCode');
const { Modifier } = require('./Modifier');
const { validateCommand } = require("./validateCommand");

/**
 * Transform at-driver/webdriver code points into an applescript and run it.
 * KeyCombination -> AppleKeyCodeCommand -> Applescript -> runScript
 * @file
 */

const APPLESCRIPT_RETRY = 3;
const APPLESCRIPT_TIMEOUT = 5;
const APPLESCRIPT_TIMEOUT_ERROR = 'AppleEvent timed out';

exports.KeyboardAction = KeyboardAction;

exports.KeyCode = KeyCode;

exports.Modifier = Modifier;

const ScriptKind = exports.ScriptKind = 'Applescript.Script';

/**
 * Create an Applescript object.
 * @param {string} script
 * @returns {Applescript.Script}
 */
const applescript = (exports.applescript = function (script) {
  return {
    kind: ScriptKind,
    script,
  };
});

/**
 * Render a command into an Applescript.
 * @param {Applescript.Command} command
 * @returns {Applescript.Script}
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
 * @param {Applescript.Script} script
 * @returns {Promise<string | void>}
 * @throws
 */
exports.runScript = async script => {
  return await retryOnTimeout(async () => await execScript(script));
};
