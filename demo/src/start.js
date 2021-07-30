'use strict';

const child_process = require('child_process');
const path = require('path');

//const nvdaDir = 'C:\\Program Files (x86)\\NVDA';
//
//const cwds = [
//  process.cwd(),
//  nvdaDir,
//  nvdaDir.replace(/ /g, '\\ '),
//  `"${nvdaDir}"`,
//  `'${nvdaDir}'`,
//];
//const exes = [
//  path.join(nvdaDir, 'nvda.exe'),
//  path.join(nvdaDir.replace(/ /g, '\\ '), 'nvda.exe'),
//  `"${path.join(nvdaDir, 'nvda.exe')}"`,
//  `'${path.join(nvdaDir, 'nvda.exe')}'`,
//  'nvda.exe',
//  path.join('.', 'nvda.exe'),
//];
//const envs = [
//  process.env,
//  {
//    ...process.env,
//    PATH: [process.env.PATH, nvdaDir].join(path.delimiter)
//  },
//];
//
//const tests = exes.map((exe) => {
//  return cwds.map((cwd) => {
//    return envs.map((env) => {
//      return [exe, cwd, env];
//    });
//  }).flat();
//}).flat();
//
//(async () => {
//  for (const [exe, cwd, env] of tests) {
//    await new Promise((resolve) => {
//        const child = child_process.spawn(exe, ['--check-running'], {env, cwd});
//
//        child.on('error', () => resolve(['error']));
//        child.on('close', (status) => resolve(['close', status]));
//      }).then(console.log);
//  }
//})();
//
//return;

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
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

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
