'use strict';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const installCommand = require('./commands/install');
const serveCommand = require('./commands/serve');
const uninstallCommand = require('./commands/uninstall');

/**
 * @param {import('process')} process
 */
module.exports = async process => {
  await yargs(hideBin(process.argv))
    .command(installCommand)
    .command(uninstallCommand)
    .command(serveCommand)
    .demandCommand(1, 1)
    .strict()
    .help()
    .parse();
};
