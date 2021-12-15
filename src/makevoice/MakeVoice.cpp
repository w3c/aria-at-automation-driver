// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright © Microsoft Corporation. All rights reserved

/**
 * This application assembles a TTS voice. It is maintained as a convenience
 * for C++ development. Its logic is duplicated in JavaScript by the source
 * code file `scripts/install.js` to facilitate installation from the Node.js
 * platform.
 */
#include "stdafx.h"
#include "..\Shared\branding.h"
#include <AutomationTtsEngine_i.c>
#include <direct.h>
#include <fstream>

HRESULT createDirectoryIfAbsent(LPCWSTR location)
{
    if (CreateDirectory(location, NULL))
    {
        return S_OK;
    }
    return GetLastError() == ERROR_ALREADY_EXISTS ? S_OK : E_FAIL;
}

void copyFile(const char* sourceLocation, const char* destinationLocation)
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

std::string getSiblingFilePath(const std::string& fileName)
{
    char buffer[MAX_PATH];
    GetModuleFileNameA(nullptr, buffer, MAX_PATH);
    std::string path(buffer);
    return path.substr(0, 1 + path.find_last_of('\\')) + fileName;
}

HRESULT registerDll(const std::string& fileName)
{
    USES_CONVERSION;

    STARTUPINFO startup_info;
    PROCESS_INFORMATION process_info;
    ZeroMemory(&startup_info, sizeof(startup_info));
    startup_info.cb = sizeof(startup_info);
    ZeroMemory(&process_info, sizeof(process_info));
    std::string command = std::string("regsvr32 /s /c \"") + getSiblingFilePath(fileName) + "\"";
    DWORD dwFlags = CREATE_NO_WINDOW;

    bool result = CreateProcessW(
        NULL,
        A2W(command.c_str()),
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

int wmain(int argc, __in_ecount(argc) WCHAR* argv[])
{
    HRESULT hr = ::CoInitialize( NULL );

    if (SUCCEEDED(hr))
    {
        hr = registerDll("AutomationTtsEngine.dll");
    }

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
            getSiblingFilePath("Vocalizer.exe").c_str(),
            AUTOMATION_VOICE_HOME "\\Vocalizer.exe"
        );
    }

    ::CoUninitialize();

    return FAILED( hr );
}