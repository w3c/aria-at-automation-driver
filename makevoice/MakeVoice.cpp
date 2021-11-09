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
#include <AutomationTtsEngine_i.c>
#include <direct.h>

int wmain(int argc, __in_ecount(argc) WCHAR* argv[])
{
    HRESULT hr = S_OK;

    ::CoInitialize( NULL );

    // Programatically create a token for the new voice and set its attributes.
    if (SUCCEEDED(hr))
    {
        CComPtr<ISpObjectToken> cpToken;
        CComPtr<ISpDataKey> cpDataKeyAttribs;
        hr = SpCreateNewTokenEx(
                SPCAT_VOICES, 
                L"BocoupAutomationVoice",
                &CLSID_SampleTTSEngine, 
                L"Bocoup Automation Voice",
                0x409, 
                L"Bocoup Automation Voice",
                &cpToken,
                &cpDataKeyAttribs
        );

        //--- Set additional attributes for searching.
        if (SUCCEEDED(hr))
        {
            hr = cpDataKeyAttribs->SetStringValue(L"Gender", L"Male");
            if (SUCCEEDED(hr))
            {
                hr = cpDataKeyAttribs->SetStringValue(L"Name", L"Bocoup Automation Voice");
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
                hr = cpDataKeyAttribs->SetStringValue(L"Vendor", L"Bocoup");
            }
        }
    }

    ::CoUninitialize();

    return FAILED( hr );
}