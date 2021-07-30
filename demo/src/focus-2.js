'use strict';
const {Builder} = require('selenium-webdriver');
const debug = require('debug')('aria-at-demo');
require('geckodriver');

const cmd = async () => {
  const child = require('child_process').spawn('notepad.exe', [], {stdio: 'inherit', shell: true});

  await new Promise((resolve) => setTimeout(resolve, 3000));
  return new Promise((resolve) => {
    child.on('close', resolve);
    child.kill();
  });
};

(async () => {
  const at = require('./ats/at-nvda');

  await cmd();
  let lastSpeech = '';
  const webdriver = await new Builder()
    .forBrowser('firefox')
    .build();
  try {
    //await webdriver.get('data:text/html,<input/>');
    console.log('ready to go, apparently');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } finally {
    await webdriver.quit();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
