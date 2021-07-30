'use strict';
const path = require('path');

const atGuard = require('./at-guard');

if (process.argv.length !== 3) {
  throw new Error(
    'Exactly one AT name must be provided as a command-line argument.'
  );
}

const atName = process.argv[2];
const command = process.execPath;
const runPath = path.join(__dirname, 'run.js');

atGuard(atName, command, [runPath, atName], {stdio: 'inherit'})
  .then(() => {
    console.error('Testing complete');
  }, (error) => {
    console.error(`Error: ${error}`);
    process.exitCode = 1;
  });
