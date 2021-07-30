'use strict';
const child_process = require('child_process');
const at = require('./ats/at-nvda');

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
