'use strict';

const assert = require('assert');

const {
  applescript,
  execScript,
  keyCodeCommand,
  parseCodePoints,
  renderScript,
  retryOnTimeout,
  runScript,
} = require('../../../lib/helpers/macos/applescript.js');

suite('helpers/macos/applescript', () => {
  testEach(
    'parseCodePoints',
    ({ description }) => description,
    ({ keyCombination, command, throws }) => {
      if (throws) {
        assert.throws(() => parseCodePoints(keyCombination), throws);
      } else {
        assert.deepEqual(parseCodePoints(keyCombination), command);
      }
    },
    [
      {
        description: 'space',
        keyCombination: [' '],
        command: keyCodeCommand(['space'], []),
      },
      {
        description: 'option-a',
        keyCombination: ['\ue00a', 'a'],
        command: keyCodeCommand(['a'], ['option']),
      },
      {
        description: 'command-option-shift-b',
        keyCombination: ['\ue03d', '\ue00a', '\ue008', 'b'],
        command: keyCodeCommand(['b'], ['command', 'option', 'shift']),
      },
      { description: 'throws on null', keyCombination: ['\ue000'], throws: /unknown key/ },
      {
        description: 'throws on invalid code',
        keyCombination: ['df daf% ?'],
        throws: /unknown key/,
      },
    ],
  );

  testEach(
    'renderScript',
    ({ description }) => description,
    ({ command, script }) => {
      assert.deepEqual(renderScript(command), applescript(script));
    },
    [
      {
        description: 'space',
        command: keyCodeCommand(['space'], []),
        script:
          'with timeout of 5 seconds\n' +
          '    tell application "System Events"\n' +
          '        key code 49\n' +
          '    end tell\n' +
          'end timeout',
      },
      {
        description: 'option-a',
        command: keyCodeCommand(['a'], ['option']),
        script:
          'with timeout of 5 seconds\n' +
          '    tell application "System Events"\n' +
          '        key code 0 using option down\n' +
          '    end tell\n' +
          'end timeout',
      },
      {
        description: 'command-option-shift-b',
        command: keyCodeCommand(['b'], ['command', 'option', 'shift']),
        script:
          'with timeout of 5 seconds\n' +
          '    tell application "System Events"\n' +
          '        key code 11 using {command down, option down, shift down}\n' +
          '    end tell\n' +
          'end timeout',
      },
    ],
  );

  test('execScript', async () => {
    assert.equal(await execScript(applescript('return "hello"')), 'hello\n');
  });

  test('retryOnTimeout', async () => {
    let i = 0;
    assert.equal(
      await retryOnTimeout(async () => {
        if (i++ === 0) {
          throw new Error('AppleEvent timed out');
        }
        return 'retried';
      }),
      'retried',
    );
    assert.equal(i, 2);
  });

  test('runScript', async () =>
    assert.equal(await runScript(applescript('return "hello"')), 'hello\n'));
});

/**
 * @param {string} name
 * @param {function(T, number): string} nameDelta
 * @param {function(T, number): Promise<void> | void} testfn
 * @param {T[]} tests
 * @template T
 */
function testEach(name, nameDelta, testfn, tests) {
  for (let i = 0; i < tests.length; i++) {
    test(`${name}: ${nameDelta(tests[i], i)}`, async () => {
      await testfn(tests[i], i);
    });
  }
}
