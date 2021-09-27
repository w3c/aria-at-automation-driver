'use strict';

const child_process = require('child_process');
const {promisify} = require('util');
const path = require('path');

const sudo_prompt = require('sudo-prompt');

const elevate = (command, options) => {
  return new Promise((resolve, reject) => {
    sudo_prompt.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({stdout, stderr});
      }
    });
  });
};
const exec = promisify(child_process.exec);

// Source: Windows Language Code Identifiers (LCID)
// https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/70feba9f-294e-491e-b6eb-56532684c37f
const ENGLISH_LCID = 409;
const CLASS_NAME = 'AutomationTtsEngine.SampleTTSEngine';
const VOICE = Object.freeze({
  id: 'W3CAutomationVoice',
  attrs: {
    Age: 'Adult',
    Gender: 'Male',
    Language: ENGLISH_LCID,
    Name: 'W3C Automation Voice',
    Vendor: 'W3C'
  }
});

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

/**
 * Determine if the current process is executing with administrative
 * privileges. (This is done by attempting to write to the system registry.)
 *
 * @returns {boolean}
 */
const isAdmin = async () => {
  try {
    await exec(`reg add HKLM\\SOFTWARE\\AutomationVoiceTest /f /d test_value`);
    await exec(`reg delete HKLM\\SOFTWARE\\AutomationVoiceTest /f`);
  } catch ({}) {
    return false;
  }
  return true;
};

/**
 * Add an SAPI voice to the Windows registry.
 *
 * @param {object} options
 * @param {string} options.id - unique identifier for the voice
 * @param {object} options.attrs - one or more SAPI voice attributes
 * @param {string} options.attrs.Name - Human-readable name of voice; used by user interfaces to refer to the voice
 * @param {'x32'|'x64'} options.arch - the CPU architecture for which to register the voice
 */
const registerVoice = async ({id, clsId, attrs, arch}) => {
  if (!['x32', 'x64'].includes(arch)) {
    throw new Error(`Unsupported architecture: "${arch}".`);
  }

  if (!('Name' in attrs)) {
    throw new Error('Voice name not specified.');
  }

  const archFlag = arch === 'x32' ? '/reg:32' : '/reg:64';
  const basePath = 'HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens';
  const add = (keyPath, name, value) => {
    const valuePart = name ? `/v ${name}` : `/ve`;
    return exec(`reg add ${basePath}\\${keyPath} /f ${archFlag} ${valuePart} /d "${value}"`);
  };

  await add(id, null, attrs.Name);
  await add(id, 'CLSID', clsId);

  if ('Language' in attrs) {
    await add(id, attrs.Language, attrs.Name);
  }

  for (const [key, value] of Object.entries(attrs)) {
    await add(`${id}\\Attributes`, key, value);
  }
};

const main = async () => {
  await registerDll(path.join(__dirname, '..', 'Release', 'AutomationTtsEngine.dll'));
  const {'(Default)': clsId} = await readRegistry(`HKCR\\${CLASS_NAME}\\CLSID`);

  await registerVoice({...VOICE, clsId, arch: 'x32'});

  if (process.arch === 'x64') {
    await registerVoice({...VOICE, clsId, arch: 'x64'});
  }
};

(async () => {
  if (await isAdmin()) {
    return main();
  }

  const {stderr} = await elevate(`"${process.execPath}" ${__filename}`, {name:'foo'});
  // The sudo_prompt module does not recognize exit codes from the child
  // process, so the returned Promise may be fulfilled even in the event of an
  // error. During normal operation, the child process is not expected to write
  // to the standard error stream, so interpret any data on that stream as a
  // signal that the process failed.
  if (stderr) {
    throw stderr;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
