/// <reference path="./types.d.ts" />

'use strict';

const { loadOsModule } = require('../helpers/load-os-module');

/** @type {ATDriverModules.Interaction} */
module.exports = loadOsModule('interaction', {
  win32() {
    return require('./win32/interaction');
  },
  darwin() {
    return require('./macos/interaction');
  },
});
