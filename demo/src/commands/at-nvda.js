'use strict';
const assert = require('assert');

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

module.exports = {
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
