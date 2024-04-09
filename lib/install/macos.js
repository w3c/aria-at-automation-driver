'use strict';

const { exec: _exec } = require('child_process');
const { resolve } = require('path');
const { promisify } = require('util');

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

/** @typedef {import('child_process').ExecOptions} ExecOptions */

/**
 * @returns {Promise<void>}
 */
exports.install = async function () {
  const options = await getExecOptions();

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
