// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright © Microsoft Corporation. All rights reserved

/******************************************************************************
* MakeVoice.cpp *
*-------------*
*   This application assembles a simple voice font for the sample TTS engine.
*
******************************************************************************/
#include "stdafx.h"
#include <AutomationTtsEngine_i.c>
#include <direct.h>

int wmain(int argc, __in_ecount(argc) WCHAR* argv[])
{
    HRESULT hr = S_OK;

    ::CoInitialize( NULL );

    // Programatically create a token for the new voice and set its attributes.
    if( SUCCEEDED( hr ) )
    {
        CComPtr<ISpObjectToken> cpToken;
        CComPtr<ISpDataKey> cpDataKeyAttribs;
        hr = SpCreateNewTokenEx(
                SPCAT_VOICES, 
                L"AutomationVoice",
                &CLSID_SampleTTSEngine, 
                L"Automation Voice", 
                0x409, 
                L"Automation Voice", 
                &cpToken,
                &cpDataKeyAttribs);

        //--- Set additional attributes for searching.
        if (SUCCEEDED(hr))
        {
            hr = cpDataKeyAttribs->SetStringValue(L"Gender", L"Male");
            if (SUCCEEDED(hr))
            {
                hr = cpDataKeyAttribs->SetStringValue(L"Name", L"AutomationVoice");
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
                hr = cpDataKeyAttribs->SetStringValue(L"Vendor", L"Microsoft");
            }
        }
    }

    ::CoUninitialize();

    return FAILED( hr );
}

