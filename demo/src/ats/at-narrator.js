'use strict';
const assert = require('assert');
const child_process = require('child_process');
const path = require('path');

const roleWords = {
  checkbox: 'check box',
};
const stateWords = {
  'aria-checked': {
    false: 'not checked',
    mixed: 'half checked',
    true: 'checked',
  }
};
/**
 * @param {child_process.ChildProcess} child
 */
const watchChild = (child) => {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
};

/**
 * @param {import('stream').Readable} stream
 */
const collectStream = async (stream) => {
  let data = '';
  stream.on('data', ev => {data += ev.toString();});
  await new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return data;
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{}} [options]
 */
const shell = (command, args, options) => {
  return child_process.spawn(
    command, args, {...options, shell: true}
  );
};

const shellStart = (imageName) => {
  return shell('start', [command]);
};

const IMAGE_NAME = 'Narrator.exe';

const startNarrator = () => {
  return shellStart(IMAGE_NAME);
};

const NO_FILTER_RESULT = 'INFO: No tasks are running which match the specified criteria.';

const tasklist = ({filter: {imageName} = {}} = {}) => {
  return shell('tasklist', [
    // Output csv
    '/fo', 'csv',
    // Do not output csv header row
    '/nh',
    // Optionally filter on imageName
    ...(imageName ? ['/fi', `IMAGENAME eq ${imageName}`] : [])
  ]);
};

const isAdmin = async () => {
  return (await watchChild(shell('net', ['sess']))) === 0;
};

const taskkill = (imageName) => {
  // Needs to be run as administrator to stop Narrator.
  return shell('taskkill', ['/im', imageName]);
};

const regAdd = () => {
  return shell('reg', ['add']);
}

const regQuery = () => {
  return shell('reg', ['query', keyPath, ])
};

const SPEECH_VOICE_REGKEY = 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Narrator\\NoRoam\\SpeechVoice';

const getVoice = () => {};

const setVoice = () => {};

exports.isRunning = async () => {
  return !(await collectStream(tasklist({filter: {imagename: IMAGE_NAME}}).stdout)).includes(NO_FILTER_RESULT);
};

exports.quit = async () => {
  await watchChild(taskkill(IMAGE_NAME));
};

exports.start = async () => {
  const whenFailed = watchChild(startNarrator()).then(() => {});
  return (async function f() {
    if (await Promise.race([whenFailed, exports.isRunning()])) {
      return;
    }
    return f();
  })();
};

exports.restore = async () => {
  nvda([], {detached: true, stdio: 'ignore'}).unref();
};

exports.commands = {
  assert_role({lastSpeech, args: [expected]}) {
    assert(expected in roleWords, `Unrecognized role: "${expected}"`);

    const roleWord = roleWords[expected];

    assert(
      lastSpeech.includes(roleWord),
      `Expected "${lastSpeech}" to include "${roleWord}"`
    );
  },
  assert_state_or_property({lastSpeech, args: [name, value]}) {
    assert(name in stateWords, `Unrecognized property: "${name}"`);
    assert(value in stateWords[name], `Unrecognized state: "${value}"`);

    const stateWord = stateWords[name][value];
    assert(
      lastSpeech.includes(stateWord),
      `Expected "${lastSpeech}" to include "${stateWord}"`
    );
  },
};
