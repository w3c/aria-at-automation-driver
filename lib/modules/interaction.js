/// <reference path="./types.js" />

'use strict';

const { loadOsModule } = require('../helpers/load-os-module');

module.exports = /** @type {ATDriverModules.Interaction} */ (
  loadOsModule('interaction', {
    win32: () => require('./win32/interaction'),
    darwin: () => require('./macos/interaction'),
  })
);
