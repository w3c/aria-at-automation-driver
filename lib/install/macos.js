'use strict';

const { exec: _exec } = require('child_process');
const { resolve } = require('path');
const { promisify } = require('util');
const { 'interaction.pressKeys': pressKeys } = require('../modules/macos/interaction');

const LSREGISTER_EXECUTABLE_PATH =
  '/System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister';
const APPLICATION_NAME = 'ATDriverGenericMacOS.app';
const EXTENSION_IDENTIFIER = 'com.bocoup.ATDriverGenericMacOS.ATDriverGenericMacOSExtension';
const VOICE_IDENTIFIER =
  'com.bocoup.ATDriverGenericMacOS.ATDriverGenericMacOSExtension.ATDriverGenericMacOSExtension';
const SYSTEM_VOICE_IDENTIFIER = 'com.apple.Fred';
/**
 * This string comprises three tokens (the "type", "subtype", and
 * "manufacturer" of the Audio Unit) which must be kept in-sync with other
 * references in this project:
 *
 * - src/macos/ATDriverGenericMacOS/ATDriverGenericMacOS/Model/AudioUnitHostModel.swift
 * - src/macos/ATDriverGenericMacOS/ATDriverGenericMacOSExtension/Info.plist
 */
const PLUGIN_TRIPLET_IDENTIFIER = 'ausp atdg BOCU';

const exec = promisify(_exec);
const enableKeyAutomationPrompt = `This tool can only be installed on systems which allow automated key pressing.
Please allow the Terminal application to control your computer (the setting is
controlled in System Settings > Privacy & Security > Accessibility).`;

/** @typedef {import('child_process').ExecOptions} ExecOptions */

/**
 * Prompt the user to press any key. Resolves when the user presses a key.
 *
 * @returns {Promise<void>}
 */
const promptForManualKeyPress = async () => {
  process.stdout.write('Press any key to continue... ');
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  const byteArray = await new Promise(resolve => {
    process.stdin.once('data', data => resolve(Array.from(data)));
  });

  process.stdin.pause();
  process.stdin.setRawMode(wasRaw);
  process.stdout.write('\n');

  // Honor "Control + C" motion by exiting.
  if (byteArray[0] === 3) {
    process.exit(1);
  }
};

/**
 * @param {object} options
 * @param {boolean} options.unattended - Whether installation should fail if
 *                                       human intervention is required
 *
 * @returns {Promise<void>}
 */
exports.install = async function ({ unattended }) {
  const options = await getExecOptions();

  if (!(await canPressKeys())) {
    if (unattended) {
      throw new Error('The system cannot automate key pressing.');
    } else {
      console.error(enableKeyAutomationPrompt);

      await promptForManualKeyPress();

      if (!(await canPressKeys())) {
        throw new Error('The system cannot automate key pressing.');
      }
    }
  }

  if (await isInstalled()) {
    throw new Error('Already installed');
  }

  await removeQuarantine(options);
  await registerExtensions(options);
  await enableExtension();
  await setSystemVoice(VOICE_IDENTIFIER);
};

/**
 * @returns {Promise<void>}
 */
exports.uninstall = async function () {
  const options = await getExecOptions();

  if (!(await isInstalled())) {
    throw new Error('Not installed');
  }

  await setSystemVoice(SYSTEM_VOICE_IDENTIFIER);
  await unregisterExtensions(options);
};

/**
 * Experimentally determine whether the current system supports automated key
 * pressing by attempting to press an arbitrary key.
 *
 * @returns {Promise<boolean>}
 */
const canPressKeys = async () => {
  try {
    await pressKeys(null, { keys: ['shift'] });
  } catch ({}) {
    return false;
  }
  return true;
};

const isInstalled = async function () {
  const { stdout } = await exec(`auval -v ${PLUGIN_TRIPLET_IDENTIFIER}`);
  return /ATDriverGenericMacOSExtension/.test(stdout);
};

/**
 * @returns {Promise<ExecOptions>}
 */
const getExecOptions = async function () {
  return {
    cwd: resolve(__dirname, '../../Release/macos'),
  };
};

/**
 * Remove the "quarantine" attribute which macOS uses to prevent accidental
 * execution of code from unverified sources.
 *
 * https://support.apple.com/en-us/101987
 *
 * @param {ExecOptions} options
 * @returns {Promise<void>}
 */
async function removeQuarantine(options) {
  await exec(`xattr -r -d com.apple.quarantine ${APPLICATION_NAME}`, options);
}

/**
 * @param {ExecOptions} options
 * @returns {Promise<void>}
 */
async function registerExtensions(options) {
  await exec(`${LSREGISTER_EXECUTABLE_PATH} -f -R -trusted ${APPLICATION_NAME}`, options);
}

/**
 * @param {ExecOptions} options
 * @returns {Promise<void>}
 */
async function unregisterExtensions(options) {
  await exec(`${LSREGISTER_EXECUTABLE_PATH} -f -R -trusted -u ${APPLICATION_NAME}`, options);
}

async function enableExtension() {
  await exec(`pluginkit -e use -i ${EXTENSION_IDENTIFIER}`);
}

/**
 * @param {string} voice
 * @returns {Promise<void>}
 */
async function setSystemVoice(voice) {
  await exec(
    `defaults write com.apple.Accessibility SpeechVoiceIdentifierForLanguage '{2 = {en = "${voice}";};}`,
  );
}
