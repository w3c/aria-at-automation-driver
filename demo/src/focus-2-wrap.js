'use strict';
const child_process = require('child_process');
const which = require('which');
const at = require('./ats/at-nvda');

const index = process.argv.indexOf('--');

if (index < 0) {
  console.error('Need a command');
  process.exitCode = 1;
  return;
}

(async () => {
  const initiallyRunning = await at.isRunning();

  if (initiallyRunning) {
    await at.quit();
  }
  await at.start();

  try {
    const command = await which(process.argv[index + 1]);
    const args = process.argv.slice(index + 2);
    const child = child_process.spawn(command, args, {stdio: 'inherit'});
    process.exitCode = await new Promise((resolve) => child.on('close', resolve));

  } finally {
    if (await at.isRunning()) {
      await at.quit();
    }

    if (initiallyRunning) {
      at.restore();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
