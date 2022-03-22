'use strict';
const assert = require('assert');
const path = require('path');

const debug = require('debug')('aria-at-demo:commands:common');
const robot = require('../../../vendor/robotjs.node');

const TIMEOUT = 50 * 1000;

const typeSequence = (sequence) => {
  if (!sequence.length) {
    return;
  }
  const next = sequence[0].length === 1 ?
    sequence[0] : sequence[0].toLowerCase();
  robot.keyToggle(next, 'down');
  typeSequence(sequence.slice(1));
  robot.keyToggle(next, 'up');
};

module.exports = {
  assert_contains({lastSpeech, args: [expected, count]}) {
    assert(count === 1, 'Only `count` value of `1` is currently supported');
    assert(
      lastSpeech.includes(expected),
      `Expected "${lastSpeech}" to include "${expected}"`
    );
  },
  assert_equals({lastSpeech, args: [expected]}) {
    assert.equal(lastSpeech, expected);
  },
  clear_output() {
    return '';
  },
  nav({webdriver, ariaAtDir, args: [location]}) {
    return webdriver.get(
      `file://${path.join(ariaAtDir, location)}`
    );
  },
  press({listener, args: [sequence]}) {
    typeSequence(sequence.split('+'));
    return listener.next();
  },
  async press_until_contains({listener, args: [sequence, text]}) {
    const start = Date.now();
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`Timed out while waiting for "${text}"`));
      }, TIMEOUT);
    });

    const waitForTap = (async () => {
      while (true) {
        typeSequence(sequence.split('+'));

        const spoken = await listener.next();
        debug(`captured text: "${spoken}"`);

        if (spoken.includes(text)) {
          clearTimeout(timerId);
          return spoken;
        }
      }
    })();

    return Promise.race([waitForTap, timeout]);
  },
};
