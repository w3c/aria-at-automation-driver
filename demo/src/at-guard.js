'use strict';
const child_process = require('child_process');
const at = require('./ats/at-nvda');

/**
 * Utility function to more safely manage the system screen reader while
 * another process executes. The final three parameters are forward to the
 * `child_process.spawn` method provided by Node.js.
 *
 * @param {string} atName - name of an accessibility technology
 * @param {string} command - name of process to spawn
 * @param {string[]} args - array of arguments to provide to the process
 * @param {object} options - options for process creation
 */
module.exports = async (atName, command, args, options) => {
  const initiallyRunning = await at.isRunning();

  if (initiallyRunning) {
    await at.quit();
  }
  await at.start();

  try {
    const child = child_process.spawn(command, args, options);
    process.exitCode = await new Promise((resolve) => child.on('close', resolve));

  } finally {
    if (await at.isRunning()) {
      await at.quit();
    }

    if (initiallyRunning) {
      at.restore();
    }
  }
};
