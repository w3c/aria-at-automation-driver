/// <reference path="../types.js" />

'use strict';
const robotjs = require('robotjs');

// Commented out keys have no mapping in robotjs
const keyboardActionsMap = {
  // '\ue000': 'unidentified'
  // '\ue001': 'cancel',
  // '\ue002': 'help',
  '\ue003': 'backspace',
  '\ue004': 'tab',
  // '\ue005': 'clear',
  // '\ue006': 'return',
  '\ue007': 'enter',
  '\ue008': 'shift',
  '\ue009': 'control',
  '\ue00a': 'alt',
  '\ue00b': 'pause',
  '\ue00c': 'escape',
  '\ue00d': 'space',
  '\ue00e': 'pageup',
  '\ue00f': 'pagedown',
  '\ue010': 'end',
  '\ue011': 'home',
  '\ue012': 'left',
  '\ue013': 'up',
  '\ue014': 'right',
  '\ue015': 'down',
  '\ue016': 'insert',
  '\ue017': 'delete',
  '\ue018': ';',
  '\ue019': '=',

  '\ue01a': 'numpad_0',
  '\ue01b': 'numpad_1',
  '\ue01c': 'numpad_2',
  '\ue01d': 'numpad_3',
  '\ue01e': 'numpad_4',
  '\ue01f': 'numpad_5',
  '\ue020': 'numpad_6',
  '\ue021': 'numpad_7',
  '\ue022': 'numpad_8',
  '\ue023': 'numpad_9',

  // '\ue024': 'multiply',
  // '\ue025': 'add',
  // '\ue026': 'separator',
  // '\ue027': 'subtract',
  // '\ue028': 'decimal',
  // '\ue029': 'divide',

  '\ue031': 'f1',
  '\ue032': 'f2',
  '\ue033': 'f3',
  '\ue034': 'f4',
  '\ue035': 'f5',
  '\ue036': 'f6',
  '\ue037': 'f7',
  '\ue038': 'f8',
  '\ue039': 'f9',
  '\ue03a': 'f10',
  '\ue03b': 'f11',
  '\ue03c': 'f12',

  '\ue03d': 'command',
  '\ue040': '`',
};

const keycodeMatch = /[\ue000-\ue05d]/;

/** @type {ATDriverModules.InteractionPressKeys} */
const pressKeys = (websocket, { keys }) => {
  const robotjsKeys = keys.map(key => {
    if (keyboardActionsMap[key]) return keyboardActionsMap[key];
    if (keycodeMatch.test(key))
      throw new Error(`unknown key (\\u${key.charCodeAt(0).toString(16)})`);

    return key;
  });

  // keys = ['insert', 'tab'] means to press insert and tab together
  // push all keys down in order then release them in reverse order
  for (let x = 0; x < robotjsKeys.length; x++) {
    robotjs.keyToggle(robotjsKeys[x], 'down');
  }

  for (let x = robotjsKeys.length - 1; x >= 0; x--) {
    robotjs.keyToggle(robotjsKeys[x], 'up');
  }
  return {};
};

/** @type {ATDriverModules.Interaction} */
module.exports = {
  'interaction.pressKeys': pressKeys,
};
