'use strict';

const child_process = require('child_process');
const {promisify} = require('util');
const path = require('path');

const sudo_prompt = require('sudo-prompt');

const elevate = promisify(sudo_prompt.exec);
const exec = promisify(child_process.exec);

// Source: Windows Language Code Identifiers (LCID)
// https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/70feba9f-294e-491e-b6eb-56532684c37f
const ENGLISH_LCID = 409;
// Arbitrary string used to signal whether the current process is running with
// administrative priviledges.
const IS_ADMIN_FLAG = 'automation-voice-is-installing-as-admin';
const CLASS_NAME = 'AutomationTtsEngine.SampleTTSEngine';

// > # regsvr32
// >
// > Registers .dll files as command components in the registry.
//
// https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/regsvr32
const registerDll = (dll) => exec(`regsvr32 /s ${dll}`);

const readRegistry = async (keyName) => {
  const {stdout} = await exec(`reg query "${keyName}"`);
  return stdout.split('\r\n')
    .filter((line) => /^\s+\S+\s+\w+\s+\S/.test(line))
    .reduce((all, next) => {
      const match = next.trim().match(/(\S+)\s+\w+\s+(.*)/);
      if (match) {
        all[match[1]] = match[2];
      }
      return all;
    }, {});
};

const makeVoice = async ({name, id, clsId, attrs}) => {
  await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id} /f /ve /d "${name}"`);
  await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id} /f /v CLSID /d "${clsId}"`);

  if ('Language' in attrs) {
    await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id} /f /v ${attrs.Language} /d "${name}"`);
  }

  for (const [key, value] of Object.entries(attrs)) {
    await exec(`reg add HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\${id}\\Attributes /f /v ${key} /d "${value}"`);
  }
};

const main = async () => {
  await registerDll(path.join(__dirname, 'Release', 'AutomationTtsEngine.dll'));
  const {'(Default)': clsId} = await readRegistry(`HKCR\\${CLASS_NAME}\\CLSID`);
  const name = 'W3C Automation Voice';
  const id = 'W3CAutomationVoice';
  const attrs = {
    Age: 'Adult',
    Gender: 'Male',
    Language: ENGLISH_LCID,
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
  if (!process.argv.includes(IS_ADMIN_FLAG)) {
    await elevate(`"${process.execPath}" ${__filename} -- ${IS_ADMIN_FLAG}`, {name:'foo'});
  } else {
    await main();
  }
})();
