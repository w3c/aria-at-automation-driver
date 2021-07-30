'use strict';
const {Builder} = require('selenium-webdriver');
const debug = require('debug')('aria-at-demo');
require('geckodriver');

(async () => {
  const at = require('./ats/at-nvda');
  const initiallyRunning = await at.isRunning();

  if (initiallyRunning) {
    await at.quit();
  }
  await at.start();

  try {
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
