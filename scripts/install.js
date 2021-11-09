/**
 * This script assembles a TTS voice. It is maintained to automate installation
 * during typical Node.js workflows (e.g. `npm install`). Its logic is
 * duplicated in C++ by the source code file `makevoice/MakeVoice.cpp` to
 * facilitate installation during C++ development.
 */
'use strict';

const child_process = require('child_process');
const {promisify} = require('util');
const path = require('path');
const fs = require('fs/promises');
const {createReadStream, createWriteStream} = require('fs');

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
  id: 'BocoupAutomationVoice',
  attrs: {
    Age: 'Adult',
    Gender: 'Male',
    Language: ENGLISH_LCID,
    Name: 'Bocoup Automation Voice',
    Vendor: 'Bocoup'
  }
});
const DLL_PATH = path.join(__dirname, '..', 'Release', 'AutomationTtsEngine.dll');
const VOCALIZER_LOCAL_PATH = path.join(__dirname, '..', 'Release', 'Vocalizer.exe');
const VOCALIZER_GLOBAL_DIRECTORY = 'C:\\Program Files\\Bocoup Automation Voice';
const BASE_REGISTRY_PATH = 'HKLM\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens';

// > # regsvr32
// >
// > Registers .dll files as command components in the registry.
//
// https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/regsvr32
const registerDll = (dll) => exec(`regsvr32 /s ${dll}`);
const deregisterDll = (dll) => exec(`regsvr32 /u /s ${dll}`);

/**
 * Copy a file to a directory, creating the target directory if it does not
 * already exist.
 *
 * @param {string} sourceFile
 * @param {string} destinationDir
 */
const copyFile = async (sourceFile, destinationDir) => {
  await fs.mkdir(destinationDir, {recursive: true});
  const destinationFile = path.join(destinationDir, path.basename(sourceFile));
  const readStream = createReadStream(sourceFile);
  const writeStream = createWriteStream(destinationFile);
  readStream.pipe(writeStream);
  return new Promise((resolve, reject) => {
    readStream.on('end', resolve);
    readStream.on('error', reject);
    writeStream.on('error', reject);
  });
};

/**
 * Remove a directory if it exists.
 *
 * @param {string} directory
 */
const removeDir = (directory) => fs.rm(directory, {force: true, recursive: true});

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
  const add = (keyPath, name, value) => {
    const valuePart = name ? `/v ${name}` : `/ve`;
    return exec(`reg add ${BASE_REGISTRY_PATH}\\${keyPath} /f ${archFlag} ${valuePart} /d "${value}"`);
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

/**
 * Remove an SAPI voice from the Windows registry.
 *
 * @param {object} options
 * @param {string} options.id - unique identifier for the voice
 * @param {'x32'|'x64'} options.arch - the CPU architecture for which to deregister the voice
 */
const deregisterVoice = async ({id, arch}) => {
  if (!['x32', 'x64'].includes(arch)) {
    throw new Error(`Unsupported architecture: "${arch}".`);
  }

  const archFlag = arch === 'x32' ? '/reg:32' : '/reg:64';

  return exec(`reg delete ${BASE_REGISTRY_PATH}\\${id} /f ${archFlag}`);
};

const operations = {
  async install() {
    await copyFile(VOCALIZER_LOCAL_PATH, VOCALIZER_GLOBAL_DIRECTORY);

    await registerDll(DLL_PATH);

    const {'(Default)': clsId} = await readRegistry(`HKCR\\${CLASS_NAME}\\CLSID`);

    await registerVoice({...VOICE, clsId, arch: 'x32'});

    if (process.arch === 'x64') {
      await registerVoice({...VOICE, clsId, arch: 'x64'});
    }
  },
  async uninstall() {
    const {'(Default)': clsId} = await readRegistry(`HKCR\\${CLASS_NAME}\\CLSID`);

    await deregisterVoice({id: VOICE.id, arch: 'x32'});

    if (process.arch === 'x64') {
      await deregisterVoice({id: VOICE.id, arch: 'x64'});
    }

    await deregisterDll(DLL_PATH);

    await removeDir(VOCALIZER_GLOBAL_DIRECTORY);
  }
};

(async () => {
  const hasInstall = process.argv.includes('install');
  const hasUninstall = process.argv.includes('uninstall');

  if (hasInstall === hasUninstall) {
    throw new Error(
      'This script must be run with either "install" or "uninstall".'
    );
  }
  const operation = hasInstall ? 'install' : 'uninstall';

  if (process.platform !== 'win32') {
    console.warn(
      'This module is intended for Windows environments only and will not function elsewhere.'
    );
    return;
  }

  if (await isAdmin()) {
    return operations[operation]();
  }

  const {stderr} = await elevate(
    `"${process.execPath}" ${__filename} -- ${operation}`,
    {name:'foo'}
  );

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
