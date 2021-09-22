'use strict';

const child_process = require('child_process');
const {promisify} = require('util');
const path = require('path');

const node_windows = require('node-windows');

const elevate = promisify(node_windows.elevate);
const exec = promisify(child_process.exec);
const IS_ADMIN_FLAG = 'automation-voice-is-installing-as-admin';

const fetchClsId = async (name) => {
  const {stdout} = await exec(`reg query HKCR\\${name}\\CLSID`);
  const matches = stdout.match(/{[^}]+}/g);

  if (matches.length === 0) {
    throw new Error(`No CLSID found for DLL named "${name}".`);
  } else if (matches.length > 1) {
    throw new Error(`Multiple CLSID's found for DLL named "${name}".`);
  }
  return matches[0];
};

const makeVoice = async ({name, id, clsId, attrs}) => {
  await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id} /ve /d "${name}"`);
  await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id} /v CLSID /d "${clsId}"`);

  if ('Language' in attrs) {
    await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id} /v ${attrs.Language} /d "${name}"`);
  }

  for (const [key, value] of Object.entries(attrs)) {
    await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id}\\Attributes /v ${key} /d "${value}"`);
  }
};

const main = async () => {
  // TODO: Use `regsvr32` to register the DLL that is built for this project
  // and included in the Node.js package.
  const clsId = await fetchClsId('AutomationTtsEngine.SampleTTSEngine');
  const name = 'W3C Automation Voice';
  const id = 'W3CAutomationVoice';
  const attrs = {
    Age: 'Adult',
    Gender: 'Male',
    Language: '409:',
    Name: name,
    Vendor: 'W3C',
  };

  await makeVoice({name, id, clsId, attrs});
};

(async () => {
  // This script must be run with administrative privileges. Use an arbitrary
  // command-line option as a signal to determine whether privilege elevation
  // is necessary: if the option is absent, then this script should be run a
  // second time.
  //
  // The node-windows method `isAdmin` is not designed for this use case:
  // https://github.com/coreybutler/node-windows/issues/91
  if (process.argv[process.argv.length - 1] !== IS_ADMIN_FLAG) {
    await elevate(`"${process.execPath}" ${__filename} -- ${IS_ADMIN_FLAG}`);
  } else {
    await main();
  }
})();
