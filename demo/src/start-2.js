'use strict';

const child_process = require('child_process');
const path = require('path');
const {Builder} = require('selenium-webdriver');
require('geckodriver');

const watchChild = (child) => {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
};

const nvda = (args, options) => {
  return child_process.spawn(
    '"C:\\Program Files (x86)\\NVDA\\nvda.exe"', args, {...options, shell: true}
  );
};

const checkRunning = async () => {
  return (await watchChild(nvda(['--check-running']))) === 0;
};

const localNvdaConfig = path.join(__dirname, 'nvda-config');

(async () => {
  const initiallyRunning = await checkRunning();

  if (initiallyRunning) {
    await watchChild(nvda(['--quit']));
  }

  try {
    const child = nvda(['--minimal', `--config-path=${path.join(__dirname, '..')}`]);
	while (!await checkRunning()) { console.log('waiting'); }
    try {
      const webdriver = await new Builder()
        .forBrowser('firefox')
        .build();
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await webdriver.quit();
      console.log(await checkRunning());
    } finally {
      await watchChild(nvda(['--quit']));
    }
  } finally {
    if (initiallyRunning) {
      console.log('restarting');
      nvda([], {detached: true, stdio: 'ignore'}).unref();
    }
  }

  console.log(await checkRunning());
})();
