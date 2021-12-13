// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright © Microsoft Corporation. All rights reserved

/*******************************************************************************
* TtsEngObj.cpp *
*---------------*
*   Description:
*       This module is the main implementation file for the CTTSEngObj class.
*******************************************************************************/

//--- Additional includes
#include "stdafx.h"
#include "TtsEngObj.h"
#include "ttsengutil.h"
#include <stdio.h>
#include <iostream>
#include <windows.h>

Logger ttsEngLogger(L"ttseng.txt");

// Number of milliseconds to wait between queries for "actions" from the
// ISpTTSEngineSite.
static const int ABORT_SIGNAL_POLLING_PERIOD = 100;

//--- Local
std::string to_utf8(const std::wstring& s, ULONG length)
{
    std::string utf8;
    int len = WideCharToMultiByte(CP_UTF8, 0, s.c_str(), length, NULL, 0, NULL, NULL);
    if (len > 0)
    {
        utf8.resize(len);
        WideCharToMultiByte(CP_UTF8, 0, s.c_str(), length, &utf8[0], len, NULL, NULL);
    }
    return utf8;
}

#define SPEECH_BUFFER_SIZE 4096

/**
 * Build an "environment block" as specified by ProcessCreate. This should
 * describe a process variable environment which is nearly identical to that of
 * the current process, with the sole difference of one additional variable
 * named "WORDS" set to the value specified by the `text` parameter.
 */
HRESULT createEnv(std::string text, TCHAR* newEnv)
{
    LPTCH currentEnv = GetEnvironmentStrings();
    LPTSTR currentEnvProgress, newEnvProgress;

    if (currentEnv == NULL)
    {
        return E_FAIL;
    }

    currentEnvProgress = (LPTSTR)currentEnv;
    newEnvProgress = (LPTSTR)newEnv;

    while (*currentEnvProgress)
    {
        if (FAILED(StringCchCopy(newEnvProgress, SPEECH_BUFFER_SIZE, currentEnvProgress)))
        {
            FreeEnvironmentStrings(currentEnv);
            return E_FAIL;
        }
        newEnvProgress += lstrlen(newEnvProgress) + 1;
        currentEnvProgress += lstrlen(currentEnvProgress) + 1;
    }

    FreeEnvironmentStrings(currentEnv);

    if (FAILED(StringCchCopy(newEnvProgress, SPEECH_BUFFER_SIZE, TEXT("WORDS="))))
    {
        return E_FAIL;
    }

    // Advance by the string length in order to overwrite the trailing NULL byte added
    // by the previous invocation of `StringCchCopy` as the input value should be part of
    // the same string.
    newEnvProgress += lstrlen(newEnvProgress);

    std::wstring wideText(text.begin(), text.end());
    if (FAILED(StringCchCopy(newEnvProgress, SPEECH_BUFFER_SIZE, (STRSAFE_LPCWSTR)wideText.c_str())))
    {
        return E_FAIL;
    }

    // Terminate the block with a null byte
    newEnvProgress += lstrlen(newEnvProgress) + 1;
    *newEnvProgress = (TCHAR)0;

    return S_OK;
}

/**
 * Vocalize a string of text.
 *
 * The Microsoft Speech API is capable of vocalizing text via ISpVoice, but
 * ISpVoice cannot be used from an implementation of ISpTTSEngine because the
 * Microsoft Speech API is not capable of being used recursively.
 *
 * Evidence: "Stack Overflow - Speaking with an ISpVoice from a ISpTTSEngine"
 * https://stackoverflow.com/questions/69655189/speaking-with-an-ispvoice-from-a-ispttsengine
 *
 * This function performs the vocalization by creating a subprocess for the
 * project's C++/CLI solution named "Vocalizer" and passing it the desired text
 * via an environment variable.
 */
HRESULT vocalize(std::string text, ISpTTSEngineSite* pOutputSite)
{
    STARTUPINFO startup_info;
    PROCESS_INFORMATION process_info;
    ZeroMemory(&startup_info, sizeof(startup_info));
    startup_info.cb = sizeof(startup_info);
    ZeroMemory(&process_info, sizeof(process_info));
    TCHAR command[] = TEXT("C:\\Program Files\\Bocoup Automation Voice\\Vocalizer.exe");
    DWORD dwFlags = CREATE_NO_WINDOW;
    TCHAR newEnv[SPEECH_BUFFER_SIZE];

#ifdef UNICODE
    dwFlags |= CREATE_UNICODE_ENVIRONMENT;
#endif

    if (FAILED(createEnv(text, newEnv))) {
        return E_FAIL;
    }

    bool result = CreateProcessW(
        NULL,
        command,
        NULL,
        NULL,
        false,
        dwFlags,
        (LPVOID)newEnv,
        NULL,
        &startup_info,
        &process_info
    );

    if (!result)
    {
        return E_FAIL;
    }

    // Wait for speech to be rendered or for the ISpTTSEngineSite to signal
    // that rendering should be aborted.
    while (WaitForSingleObject(process_info.hProcess, ABORT_SIGNAL_POLLING_PERIOD) == WAIT_TIMEOUT)
    {
        if (pOutputSite->GetActions() & SPVES_ABORT)
        {
            TerminateProcess(process_info.hProcess, 0);
        }
    }

    CloseHandle(process_info.hProcess);
    CloseHandle(process_info.hThread);

    return S_OK;
}


/*****************************************************************************
* CTTSEngObj::FinalConstruct *
*----------------------------*
*   Description:
*       Constructor
*****************************************************************************/
HRESULT CTTSEngObj::FinalConstruct()
{
    //voiceLog = Logger(L"CTTSEngObj.txt");

    //Logger(L"FinalContructor.txt").log(L"FinalConstruct()\n");

    ttsEngLogger.log(L"FinalConstruct()\n");
    //voiceLog.log(L"FinalConstruct()\n");

    HRESULT hr = S_OK;

    //--- Init vars
    m_hVoiceData = NULL;
    m_pVoiceData = NULL;
    m_pWordList  = NULL;
    m_ulNumWords = 0;

    hr = m_cpVoice.CoCreateInstance(CLSID_SpVoice);

    if (FAILED(hr))
    {
        emit(MessageType::ERR, "Voice initialization failed");
        ttsEngLogger.log(L"Voice initialization failed\n");
    }
    else
    {
        emit(MessageType::LIFECYCLE, "Voice initialization succeeded");
        ttsEngLogger.log(L"Voice initialization succeeded\n");
    }

    return hr;
}

/*****************************************************************************
* CTTSEngObj::FinalRelease *
*--------------------------*
*   Description:
*       destructor
*****************************************************************************/
void CTTSEngObj::FinalRelease()
{
    ttsEngLogger.log(L"FinalRelease()\n");
    //voiceLog.log(L"FinalRelease()\n");

    delete m_pWordList;

    if (m_pVoiceData)
    {
        ::UnmapViewOfFile((void*)m_pVoiceData);
    }

    if (m_hVoiceData)
    {
        ::CloseHandle(m_hVoiceData);
    }

    emit(MessageType::LIFECYCLE, "Voice destroyed");
    ttsEngLogger.log(L"Voice destroyed\n");
}

//
//=== ISpObjectWithToken Implementation ======================================
//

/*****************************************************************************
* CTTSEngObj::SetObjectToken *
*----------------------------*
*   Description:
*       This function performs the majority of the initialization of the voice.
*   Once the object token has been provided, the filenames are read from the
*   token key and the files are mapped.
*****************************************************************************/
STDMETHODIMP CTTSEngObj::SetObjectToken(ISpObjectToken * pToken)
{
    ttsEngLogger.log(L"SetObjectToken()\n");
    return SpGenericSetObjectToken(pToken, m_cpToken);
}


//
//=== ISpTTSEngine Implementation ============================================
//

/*****************************************************************************
* CTTSEngObj::Speak *
*-------------------*
*   Description:
*       This is the primary method that SAPI calls to render text.
*-----------------------------------------------------------------------------
*   Input Parameters
*
*   pUser
*       Pointer to the current user profile object. This object contains
*       information like what languages are being used and this object
*       also gives access to resources like the SAPI master lexicon object.
*
*   dwSpeakFlags
*       This is a set of flags used to control the behavior of the
*       SAPI voice object and the associated engine.
*
*   VoiceFmtIndex
*       Zero based index specifying the output format that should
*       be used during rendering.
*
*   pTextFragList
*       A linked list of text fragments to be rendered. There is
*       one fragement per XML state change. If the input text does
*       not contain any XML markup, there will only be a single fragment.
*
*   pOutputSite
*       The interface back to SAPI where all output audio samples and events are written.
*
*   Return Values
*       S_OK - This should be returned after successful rendering or if
*              rendering was interrupted because *pfContinue changed to FALSE.
*       E_INVALIDARG 
*       E_OUTOFMEMORY
*
*****************************************************************************/
STDMETHODIMP CTTSEngObj::Speak(DWORD dwSpeakFlags,
    REFGUID rguidFormatId,
    const WAVEFORMATEX* pWaveFormatEx,
    const SPVTEXTFRAG* pTextFragList,
    ISpTTSEngineSite* pOutputSite)
{
    ttsEngLogger.log(L"Speak()\n");

    //--- Check args
    if (SP_IS_BAD_INTERFACE_PTR(pOutputSite) || SP_IS_BAD_READ_PTR(pTextFragList))
    {
        ttsEngLogger.log(L"Speak(): Invalid Arg.\n");
        return E_INVALIDARG;
    }
    HRESULT hr = S_OK;

    for (const SPVTEXTFRAG* textFrag = pTextFragList; textFrag != NULL; textFrag = textFrag->pNext)
    {
        if (textFrag->State.eAction == SPVA_Bookmark)
        {
            ULONGLONG pullEventInterest;
            hr = pOutputSite->GetEventInterest(&pullEventInterest);

            if (FAILED(hr))
            {
                emit(MessageType::ERR, "Unable to query output site for event interest.");
                continue;
            }

            if (pullEventInterest & SPEI_TTS_BOOKMARK)
            {
                std::string part = to_utf8(textFrag->pTextStart, textFrag->ulTextLen);
                SPEVENT event;
                event.eEventId = SPEI_TTS_BOOKMARK;
                event.elParamType = SPET_LPARAM_IS_STRING;
                event.wParam = atol(part.c_str());
                char* p = (char*)calloc(textFrag->ulTextLen + 1, sizeof(textFrag->pTextStart));
                strcpy(p, part.c_str());
                event.lParam = (LPARAM)p;
                pOutputSite->AddEvents(&event, 1);
                free(p);
            }
            continue;
        }

        std::string part = to_utf8(textFrag->pTextStart, textFrag->ulTextLen);
        hr = emit(MessageType::SPEECH, part);

        if (FAILED(hr))
        {
            emit(MessageType::ERR, "Emission failed");
            break;
        }

        hr = vocalize(part, pOutputSite);

        if (FAILED(hr))
        {
            emit(MessageType::ERR, "Vocalization failed");
        }
    }


    ttsEngLogger.log(L"Speak(): Returns: %lx.\n", hr);

    return hr;
}

/*****************************************************************************
* CTTSEngObj::GetVoiceFormat *
*----------------------------*
*   Description:
*       This method returns the output data format associated with the
*   specified format Index. Formats are in order of quality with the best
*   starting at 0.
*****************************************************************************/
STDMETHODIMP CTTSEngObj::GetOutputFormat(const GUID* pTargetFormatId, const WAVEFORMATEX* pTargetWaveFormatEx,
    GUID* pDesiredFormatId, WAVEFORMATEX** ppCoMemDesiredWaveFormatEx)
{
    ttsEngLogger.log(L"GetOutputFormat()\n");
    return SpConvertStreamFormatEnum(SPSF_11kHz16BitMono, pDesiredFormatId, ppCoMemDesiredWaveFormatEx);
}
