/// <reference path="./types.js" />

'use strict';

const { loadOsModule } = require('../helpers/load-os-module');

/** @type {ATDriverModules.Session} */
module.exports = loadOsModule('session', {
  win32() {
    return require('./win32/session');
  },
  darwin() {
    return require('./macos/session');
  },
});
