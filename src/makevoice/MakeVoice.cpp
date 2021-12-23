// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright � Microsoft Corporation. All rights reserved

/**
 * This application assembles a TTS voice. It is maintained as a convenience
 * for C++ development. Its logic is duplicated in JavaScript by the source
 * code file `scripts/install.js` to facilitate installation from the Node.js
 * platform.
 */
#include "stdafx.h"
#include "WindowsRegistry.h"
#include "..\Shared\branding.h"
#include <AutomationTtsEngine_i.c>
#include <direct.h>
#include <fstream>

// A default text to speech voice is chosen when first used.Vocalize some
// text to make the system chooseand save a default from the currently
// installed voices.Additionally test that text to speech works locally.
#define UTTERANCE_FOR_SETTING_DEFAULT_VOICE _T("Installing voice named " AUTOMATION_VOICE_NAME)

#ifdef UNICODE
#define tputenv_s _wputenv_s
#else
#define tputenv_s _putenv_s
#endif

HRESULT createDirectoryIfAbsent(LPCWSTR location)
{
    if (CreateDirectory(location, NULL))
    {
        return S_OK;
    }
    return GetLastError() == ERROR_ALREADY_EXISTS ? S_OK : E_FAIL;
}

void copyFile(const TCHAR* sourceLocation, const TCHAR* destinationLocation)
{
    std::ifstream source(sourceLocation, std::ios::binary);
    std::ofstream destination(destinationLocation, std::ios::binary);

    std::istreambuf_iterator<char> begin_source(source);
    std::istreambuf_iterator<char> end_source;
    std::ostreambuf_iterator<char> begin_destination(destination);

    copy(begin_source, end_source, begin_destination);

    source.close();
    destination.close();
}

tstring getSiblingFilePath(const tstring& fileName)
{
    TCHAR buffer[MAX_PATH];
    GetModuleFileName(nullptr, buffer, MAX_PATH);
    tstring path(buffer);
    return path.substr(0, 1 + path.find_last_of('\\')) + fileName;
}

HRESULT runSubprocess(tstring& command)
{
    STARTUPINFO startup_info;
    PROCESS_INFORMATION process_info;
    ZeroMemory(&startup_info, sizeof(startup_info));
    startup_info.cb = sizeof(startup_info);
    ZeroMemory(&process_info, sizeof(process_info));
    DWORD dwFlags = CREATE_NO_WINDOW;

    bool result = CreateProcess(
        NULL,
        &command[0],
        NULL,
        NULL,
        false,
        dwFlags,
        NULL,
        NULL,
        &startup_info,
        &process_info
    );

    if (!result)
    {
        return E_FAIL;
    }

    WaitForSingleObject(process_info.hProcess, INFINITE);

    DWORD exitCode;

    if (!GetExitCodeProcess(process_info.hProcess, &exitCode))
    {
        return E_FAIL;
    }

    CloseHandle(process_info.hProcess);
    CloseHandle(process_info.hThread);

    return exitCode == 0 ? S_OK : E_FAIL;
}

enum class DllAction { install, uninstall };

HRESULT updateDllRegistry(const tstring& fileName, DllAction action)
{
    tstring command = tstring(_T("regsvr32 /s /c "))
        + (action == DllAction::install ? _T("") : _T("/u "))
        + _T("\"") + getSiblingFilePath(fileName) + _T("\"");

    return runSubprocess(command);
}

int parseArgs(int argc, WCHAR* argv[])
{
    for (int i = 1; i < argc; i += 1)
    {
        if (_tcscmp(argv[i], L"/u") == 0)
        {
            return false;
        }
    }
    return true;
}

HRESULT install()
{
    HRESULT hr = updateDllRegistry(_T("AutomationTtsEngine.dll"), DllAction::install);

    // Programatically create a token for the new voice and set its attributes.
    if (SUCCEEDED(hr))
    {
        CComPtr<ISpObjectToken> cpToken;
        CComPtr<ISpDataKey> cpDataKeyAttribs;
        hr = SpCreateNewTokenEx(
            SPCAT_VOICES,
            TEXT(AUTOMATION_VOICE_ID),
            &CLSID_SampleTTSEngine,
            TEXT(AUTOMATION_VOICE_NAME),
            0x409,
            TEXT(AUTOMATION_VOICE_NAME),
            &cpToken,
            &cpDataKeyAttribs
        );

        //--- Set additional attributes for searching.
        if (SUCCEEDED(hr))
        {
            hr = cpDataKeyAttribs->SetStringValue(L"Gender", L"Male");
            if (SUCCEEDED(hr))
            {
                hr = cpDataKeyAttribs->SetStringValue(L"Name", TEXT(AUTOMATION_VOICE_NAME));
            }
            if (SUCCEEDED(hr))
            {
                hr = cpDataKeyAttribs->SetStringValue(L"Language", L"409");
            }
            if (SUCCEEDED(hr))
            {
                hr = cpDataKeyAttribs->SetStringValue(L"Age", L"Adult");
            }
            if (SUCCEEDED(hr))
            {
                hr = cpDataKeyAttribs->SetStringValue(L"Vendor", TEXT(AUTOMATION_VOICE_VENDOR));
            }
        }
    }

    if (SUCCEEDED(hr))
    {
        hr = createDirectoryIfAbsent(
            TEXT(AUTOMATION_VOICE_HOME)
        );
    }

    if (SUCCEEDED(hr))
    {
        copyFile(
            getSiblingFilePath(_T("Vocalizer.exe")).c_str(),
            _T(AUTOMATION_VOICE_HOME "\\Vocalizer.exe")
        );

        if (tputenv_s(_T("WORDS"), UTTERANCE_FOR_SETTING_DEFAULT_VOICE) != 0)
        {
            hr = E_FAIL;
        }
    }

    if (SUCCEEDED(hr))
    {
        hr = runSubprocess(tstring(_T(AUTOMATION_VOICE_HOME "\\Vocalizer.exe")));
    }

    if (SUCCEEDED(hr))
    {
        // Install the project's custom NVDA add-on.
        //
        // This operation is somewhat fragile (in that it may be broken by future releases
        // of NVDA) because it assumes the location and format of the screen reader's "add
        // on" directory. Although it would be preferable to first "package" the add-on and
        // then install it using the same procedure as an end-user, that approach requires
        // manual interaction with a modal dialog and is therefore inappropriate for the
        // needs of this project.
        std::wstring dest = _wgetenv(L"USERPROFILE");
        wchar_t* subdirectories[] = {
            L"\\AppData", L"\\Roaming", L"\\nvda", L"\\addons", L"\\nvda-configuration-server"
        };
        const int size = sizeof(subdirectories) / sizeof(subdirectories[0]);

        for (int i = 0; i < size; i += 1)
        {
            dest += subdirectories[i];
            hr = createDirectoryIfAbsent(dest.c_str());

            if (FAILED(hr))
            {
                break;
            }
        }

        std::wstring source = getSiblingFilePath(L"..\\lib\\nvda-configuration-server");
        std::wstring command = L"xcopy /E /Y " + source + L" " + dest;
        hr = runSubprocess(command);
    }

    return hr;
}

HRESULT uninstall()
{
    HRESULT hr = updateDllRegistry(_T("AutomationTtsEngine.dll"), DllAction::uninstall);

    if (!SUCCEEDED(hr))
    {
        return hr;
    }

    WindowsRegistry::RegistryPathParts pathParts;

    hr = WindowsRegistry::splitRegistryPath(SPCAT_VOICES, &pathParts);

    if (!SUCCEEDED(hr))
    {
        return hr;
    }

    hr = WindowsRegistry::deleteNode(
        pathParts.root,
        pathParts.rest + _T("\\") + _T(AUTOMATION_VOICE_ID)
    ) ? S_OK : E_FAIL;

    if (!SUCCEEDED(hr))
    {
        return hr;
    }

    hr = system("rmdir /Q /S \"" AUTOMATION_VOICE_HOME "\"") == 0 ? S_OK : E_FAIL;

    if (!SUCCEEDED(hr))
    {
        return hr;
    }

    std::wstring command(L"rmdir /Q /S \"");
    command += _wgetenv(L"USERPROFILE");
    command += L"\\AppData\\Roaming\\nvda\\addons\\nvda-configuration-server\"";

    return _wsystem(command.c_str()) == 0 ? S_OK : E_FAIL;
}

int wmain(int argc, __in_ecount(argc) WCHAR* argv[])
{
    bool shouldInstall = parseArgs(argc, argv);

    HRESULT hr = ::CoInitialize( NULL );

    if (SUCCEEDED(hr))
    {
        hr = shouldInstall ? install() : uninstall();
    }

    ::CoUninitialize();

    return FAILED( hr );
}