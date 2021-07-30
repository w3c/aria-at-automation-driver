'use strict';
const assert = require('assert');
const child_process = require('child_process');
const path = require('path');

const localNvdaConfig = path.join(__dirname, 'nvda-config');
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
const watchChild = (child) => {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
};

const nvda = (args, options) => {
  return child_process.spawn(
    '"C:\\Program Files (x86)\\NVDA\\nvda.exe"', args, {...options, shell: true}
  );
};

exports.isRunning = async () => {
  return (await watchChild(nvda(['--check-running']))) === 0;
};

exports.quit = async () => {
  return watchChild(nvda(['--quit']));
};

exports.start = async () => {
  const whenFailed = watchChild(
    nvda(['--minimal', `--config-path=${path.join(__dirname, '..', '..')}`])
  );
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
