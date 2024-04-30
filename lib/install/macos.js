'use strict';

const { exec: _exec } = require('child_process');
const { resolve } = require('path');
const { promisify } = require('util');

const debug = require('debug')('install');

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
  let stdout;

  try {
    ({ stdout } = await exec(`auval -v ${PLUGIN_TRIPLET_IDENTIFIER}`));
  } catch (error) {
    if (error.stdout && error.stdout.includes('didn\'t find the component')) {
      return false;
    }
    throw error;
  }

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
 * @returns {Promise<boolean>} Whether a change took place
 */
async function removeQuarantine(options) {
  debug('Removing macOS quarantine');
  await exec(`xattr -r -d com.apple.quarantine ${APPLICATION_NAME}`, options);
  return true;
}

/**
 * @param {ExecOptions} options
 * @returns {Promise<void>}
 */
async function registerExtensions(options) {
  debug('Registering trusted macOS extension');
  await exec(`${LSREGISTER_EXECUTABLE_PATH} -f -R -trusted ${APPLICATION_NAME}`, options);
}

/**
 * @param {ExecOptions} options
 * @returns {Promise<void>}
 */
async function unregisterExtensions(options) {
  debug('Unregistering trusted macOS extension');
  await exec(`${LSREGISTER_EXECUTABLE_PATH} -f -R -trusted -u ${APPLICATION_NAME}`, options);
}

async function enableExtension() {
  debug('Enabling macOS extension');
  await exec(`pluginkit -e use -i ${EXTENSION_IDENTIFIER}`);
}

/**
 * @param {string} newValue the identifier for the voice to set
 * @returns {Promise<void>}
 */
async function setSystemVoice(newValue) {
  debug(`Setting macOS system voice to "${newValue}"`);

  const {stdout} = await exec('defaults read com.apple.Accessibility SpeechVoiceIdentifierForLanguage');
  const currentValue = stdout.replace(/[\s]/g, '').match(/2={en="([^"]+)";};/);

  debug(`Current value: ${currentValue ? JSON.stringify(currentValue[1]) : '(unset)'}`);

  if (currentValue && currentValue[1] === newValue) {
    debug('Already set.');
    return;
  }

  await exec(
    `defaults write com.apple.Accessibility SpeechVoiceIdentifierForLanguage '{2 = {en = "${newValue}";};}'`,
  );
}
