'use strict';

const { exec: _exec } = require('child_process');
const { resolve } = require('path');
const { promisify } = require('util');

const exec = promisify(_exec);

const MAKE_VOICE_EXE = 'MakeVoice.exe';

exports.install = async function () {
  await exec(`${MAKE_VOICE_EXE}`, await getExecOptions());
};

exports.uninstall = async function () {
  await exec(`${MAKE_VOICE_EXE} /u`, await getExecOptions());
};

/**
 * @returns {Promise<import('child_process').ExecOptions>}
 */
async function getExecOptions() {
  return {
    cwd: resolve(__dirname, '../../Release'),
  };
}
