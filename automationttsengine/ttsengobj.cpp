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
#include <stdio.h>
#include <iostream>
#include <windows.h>

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

enum class MessageType {
    LIFECYCLE,
    SPEECH,
    ERR
};

HRESULT emit(MessageType type, std::string data) {
    HANDLE pipe = CreateFile(
        L"\\\\.\\pipe\\my_pipe",
        GENERIC_WRITE,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (pipe == INVALID_HANDLE_VALUE)
    {
        fprintf(stderr, "Failed to connect to pipe.");
        return E_HANDLE;
    }

    std::string typeString;
    if (type == MessageType::LIFECYCLE)
    {
        typeString = "lifecycle";
    }
    else if (type == MessageType::SPEECH)
    {
        typeString = "speech";
    }
    else
    {
        typeString = "error";
    }
    std::string message(typeString + ":" + data);
    DWORD numBytesWritten = 0;
    BOOL result = WriteFile(
        pipe, // handle to our outbound pipe
        message.c_str(), // data to send
        message.size(),
        &numBytesWritten, // will store actual amount of data sent
        NULL // not using overlapped IO
    );

    // Close the pipe (automatically disconnects client too)
    CloseHandle(pipe);

    if (!result)
    {
        fprintf(stderr, "Failed to send data.");
        return E_FAIL;
    }

    return S_OK;
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

HRESULT vocalize(std::string text, HANDLE& handle)
{
    STARTUPINFO startup_info;
    PROCESS_INFORMATION process_info;
    ZeroMemory(&startup_info, sizeof(startup_info));
    startup_info.cb = sizeof(startup_info);
    ZeroMemory(&process_info, sizeof(process_info));
    // TODO: use stable path to `Vocalizer.exe` as defined in `MakeVoice.cpp`
    TCHAR command[] = TEXT("c:\\Users\\mike\\projects\\bocoup\\facebook-aria\\windows-sapi-tts-engine-for-automation\\Release\\Vocalizer.exe");
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

    handle = process_info.hProcess;
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
    }
    else
    {
        emit(MessageType::LIFECYCLE, "Voice initialization succeeded");
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
    //--- Check args
    if (SP_IS_BAD_INTERFACE_PTR(pOutputSite) || SP_IS_BAD_READ_PTR(pTextFragList))
    {
        return E_INVALIDARG;
    }
    HRESULT hr = S_OK;
    std::string speech = "";

    for (const SPVTEXTFRAG* textFrag = pTextFragList; textFrag != NULL; textFrag = textFrag->pNext)
    {
        if (textFrag->State.eAction == SPVA_Bookmark)
        {
            continue;
        }

        std::string part = to_utf8(textFrag->pTextStart, textFrag->ulTextLen);
        hr = emit(MessageType::SPEECH, part);
        speech += part;

        if (FAILED(hr))
        {
            emit(MessageType::ERR, "Emission failed");
            break;
        }
    }

    // Interrupt previously-initiated vocalization, if any
    if (m_vocalization)
    {
        TerminateProcess(m_vocalization, 0);
        m_vocalization = NULL;
    }
    hr = vocalize(speech, m_vocalization);

    if (FAILED(hr))
    {
        emit(MessageType::ERR, "Vocalization failed");
    }

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
    return SpConvertStreamFormatEnum(SPSF_11kHz16BitMono, pDesiredFormatId, ppCoMemDesiredWaveFormatEx);
}