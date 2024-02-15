/// <reference path="./types.js" />

'use strict';

const { loadOsModule } = require('../helpers/load-os-module');

module.exports = /** @type {ATDriverModules.Session} */ (
  loadOsModule('session', {
    win32: () => require('./win32/session'),
    darwin: () => require('./macos/session'),
  })
);
