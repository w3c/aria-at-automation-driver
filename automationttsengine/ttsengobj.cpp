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
#include <thread>

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

    hr = CoCreateInstance(CLSID_SpVoice, NULL, CLSCTX_ALL, IID_ISpVoice, (void**)&m_cpVoice2);

    if (FAILED(hr))
    {
        emit(MessageType::ERR, "Second voice initialization failed");
    }
    else
    {
        emit(MessageType::LIFECYCLE, "Second voice initialization succeeded");
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

    if (m_cpVoice2)
    {
        m_cpVoice2->Release();
        m_cpVoice2 = NULL;
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

std::string speakFlagsToString(DWORD dwSpeakFlags)
{
    std::string flagsString = "";
    if (dwSpeakFlags & SPF_DEFAULT) {
        flagsString += "SPF_DEFAULT,";
    }
    if (dwSpeakFlags & SPF_ASYNC) {
        flagsString += "SPF_ASYNC,";
    }
    if (dwSpeakFlags & SPF_PURGEBEFORESPEAK) {
        flagsString += "SPF_PURGEBEFORESPEAK,";
    }
    if (dwSpeakFlags & SPF_IS_FILENAME) {
        flagsString += "SPF_IS_FILENAME,";
    }
    if (dwSpeakFlags & SPF_IS_XML) {
        flagsString += "SPF_IS_XML,";
    }
    if (dwSpeakFlags & SPF_IS_NOT_XML) {
        flagsString += "SPF_IS_NOT_XML,";
    }
    if (dwSpeakFlags & SPF_PERSIST_XML) {
        flagsString += "SPF_PERSIST_XML,";
    }
    if (dwSpeakFlags & SPF_NLP_SPEAK_PUNC) {
        flagsString += "SPF_NLP_SPEAK_PUNC,";
    }
    if (dwSpeakFlags & SPF_NLP_MASK) {
        flagsString += "SPF_NLP_MASK,";
    }
    if (dwSpeakFlags & SPF_VOICE_MASK) {
        flagsString += "SPF_VOICE_MASK,";
    }
    if (dwSpeakFlags & SPF_UNUSED_FLAGS) {
        flagsString += "SPF_UNUSED_FLAGS,";
    }
    return flagsString;
}

std::string priorityToString(SPVPRIORITY priority)
{
    switch (priority) {
        case SPVPRI_NORMAL:
            return "SPVPRI_NORMAL";
        case SPVPRI_ALERT:
            return "SPVPRI_ALERT";
        case SPVPRI_OVER:
            return "SPVPRI_OVER";
    }
    return "(unknown)";
}

std::string alertBoundaryToString(SPEVENTENUM alertBoundary) {
    switch (alertBoundary) {
        case SPEI_WORD_BOUNDARY:
            return "SPEI_WORD_BOUNDARY";
        case SPEI_SENTENCE_BOUNDARY:
            return "SPEI_SENTENCE_BOUNDARY";
        case SPEI_PHONEME:
            return "SPEI_PHONEME";
        case SPEI_VISEME:
            return "SPEI_VISEME";
        case SPEI_VOICE_CHANGE:
            return "SPEI_VOICE_CHANGE";
        case SPEI_TTS_BOOKMARK:
            return "SPEI_TTS_BOOKMARK";
    }
    return "(unknown)";
}

void waitForSpeech(HANDLE handle)
{
    bool isWaiting = true;
    int timeoutCount = 0;
    while (isWaiting) {
        DWORD dwWaitId = ::MsgWaitForMultipleObjectsEx(1, &handle, 500, 0, 0);
        /**
         * This section should invoke `pOutputSite->GetActions()` to determine if any one
         * of the `SPVESACTIONS` has occurred and if so, carry out the action.
         */
        switch (dwWaitId) {
        case WAIT_OBJECT_0:
            emit(MessageType::LIFECYCLE, "Done waiting 1");
            isWaiting = false;
            break;
        case WAIT_OBJECT_0 + 1:
            emit(MessageType::LIFECYCLE, "Done waiting 2");
            WaitMessage();
            //isWaiting = false;
            break;
        case WAIT_TIMEOUT:
            emit(MessageType::LIFECYCLE, "WAIT_TIMEOUT");
            timeoutCount += 1;
            isWaiting = timeoutCount < 10;
            break;
        default:
            emit(MessageType::LIFECYCLE, "default");
        }
    }
}

void speak(CComPtr<ISpVoice> voice, DWORD dwSpeakFlags, const SPVTEXTFRAG* textFrag)
{
    const std::wstring& text = textFrag->pTextStart;
    voice->Speak(text.substr(0, textFrag->ulTextLen).c_str(), dwSpeakFlags | SPF_PURGEBEFORESPEAK, 0);
}

std::string actionsToString(DWORD actions) {
    std::string actionsString = "";
    if (actions & SPVES_CONTINUE)
    {
        actionsString += "SPVES_CONTINUE";
    }
    if (actions & SPVES_ABORT)
    {
        actionsString += "SPVES_ABORT";
    }
    if (actions & SPVES_SKIP)
    {
        actionsString += "SPVES_SKIP,";
    }
    if (actions & SPVES_RATE)
    {
        actionsString += "SPVES_RATE,";
    }
    if (actions & SPVES_VOLUME)
    {
        actionsString += "SPVES_VOLUME,";
    }
    return actionsString;
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
    /**
     * theory 1: the early exit is hiding relevant invocations of `ISpTTSEngine::Speak`
     * verdict: nope
     */
    emit(MessageType::LIFECYCLE, "Speak invoked.");
    //--- Check args
    if (SP_IS_BAD_INTERFACE_PTR(pOutputSite) || SP_IS_BAD_READ_PTR(pTextFragList))
    {
        return E_INVALIDARG;
    }
    HRESULT hr = S_OK;

    /**
     * theory 2: the speak flags being passed in to `ISpTTSEngine::Speak` are interfering
     * verdict: nope (the flags are unset initially)
     */
    //emit(MessageType::LIFECYCLE, "original: " + speakFlagsToString(dwSpeakFlags));
    //emit(MessageType::LIFECYCLE, "modified: " + speakFlagsToString(dwSpeakFlags | SPF_ASYNC | SPF_PURGEBEFORESPEAK));

    /**
     * theory 3: the voice's priority is interfering
     * verdict: nope (the priority is initially `SPVPRI_NORMAL`, and setting it to `SPVPRI_ALERT` does not have an effect)
     */
    //SPVPRIORITY priority;
    //m_cpVoice->GetPriority(&priority);
    //emit(MessageType::LIFECYCLE, "priority (original): " + priorityToString(priority));
    //m_cpVoice->SetPriority(SPVPRI_ALERT);
    //m_cpVoice->GetPriority(&priority);
    //emit(MessageType::LIFECYCLE, "priority (modified): " + priorityToString(priority));

    /**
     * theory 4: the voice's alert boundary is interfering
     * verdict: nope (the alert boundary is initially `SPEI_WORD_BOUNDARY` and setting it to `SPEI_PHONEME` does not have an effect)
     */
    //SPEVENTENUM alertBoundary;
    //m_cpVoice->GetAlertBoundary(&alertBoundary);
    //emit(MessageType::LIFECYCLE, "alert boundary (original): " + alertBoundaryToString(alertBoundary));
    //m_cpVoice->SetAlertBoundary(SPEI_PHONEME);
    //m_cpVoice->GetAlertBoundary(&alertBoundary);
    //emit(MessageType::LIFECYCLE, "alert boundary (modified): " + alertBoundaryToString(alertBoundary));

    ISpVoice* pVoice = NULL;
    hr = CoCreateInstance(CLSID_SpVoice, NULL, CLSCTX_ALL, IID_ISpVoice, (void**)&pVoice);
    if (FAILED(hr)) {
        emit(MessageType::LIFECYCLE, "No no no");
        return hr;
    }
    for (const SPVTEXTFRAG* textFrag = pTextFragList; textFrag != NULL; textFrag = textFrag->pNext)
    {
        if (textFrag->State.eAction == SPVA_Bookmark)
        {
            continue;
        }

        const std::wstring& text = textFrag->pTextStart;
        /**
         * theory 5: the Microsoft Speech API creates a new thread for the `speak` call, allowing this function to proceed, but it joins on that thread once this function returns, blocking further speech
         * verdict: nope (blocking in the current thread appears to block the speech rendering, suggesting that the "asynchronous" call is actually only deferred)
         */
        //hr = m_cpVoice->Speak(text.substr(0, textFrag->ulTextLen).c_str(), dwSpeakFlags | SPF_ASYNC | SPF_PURGEBEFORESPEAK, 0);
        //waitForSpeech(m_cpVoice->SpeakCompleteEvent());

        /**
         * theory 6: the waiting should take place in parallel with the speaking
         * verdict: nope (calling `Speak` without `SPF_ASYNC` fails, regardless of any other threads)
         */
        //std::thread speechThread(waitForSpeech, m_cpVoice->SpeakCompleteEvent());
        //hr = m_cpVoice->Speak(text.substr(0, textFrag->ulTextLen).c_str(), dwSpeakFlags | SPF_PURGEBEFORESPEAK, 0);
        //speechThread.join();

        /**
         * theory 7: the class member `m_cpVoice` is somehow shared
         * verdict: nope (speaking synchronously fails with this instance, as well)
         */
        //hr = pVoice->Speak(text.substr(0, textFrag->ulTextLen).c_str(), dwSpeakFlags | SPF_PURGEBEFORESPEAK, 0);

        /**
         * theory 8: speaking needs to take place synchronously on a dedicated thread
         * verdict: nope
         */
        //std::thread speakThread(speak, m_cpVoice, dwSpeakFlags, textFrag);
        //std::thread speechThread(waitForSpeech, m_cpVoice->SpeakCompleteEvent());
        //speechThread.join();

        /**
         * theory 9: the class member's automatic reference counting is interfering
         * verdict: nope (this approach produces the same undesirable behavior)
         */
        //hr = m_cpVoice2->Speak(text.substr(0, textFrag->ulTextLen).c_str(), dwSpeakFlags | SPF_ASYNC | SPF_PURGEBEFORESPEAK, 0);

        hr = m_cpVoice->Speak(text.substr(0, textFrag->ulTextLen).c_str(), dwSpeakFlags | SPF_ASYNC | SPF_PURGEBEFORESPEAK, 0);

        if (FAILED(hr))
        {
            emit(MessageType::ERR, "Speaking failed");
            break;
        }

        hr = emit(MessageType::SPEECH, to_utf8(textFrag->pTextStart, textFrag->ulTextLen));
        if (FAILED(hr))
        {
            break;
        }
    }

    /**
     * theory 10: relevant actions in the engine site are being ignored
     * verdict: nope (only SPVES_RATE and SPVES_VOLUME are set at this time, and again, the voice doesn't begin to sound until after* `ISpTTSEngine::Speak` has returned)
     */
    for (int i = 0; i < 5; i += 1) {
        emit(MessageType::LIFECYCLE, actionsToString(pOutputSite->GetActions()));
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    pVoice->Release();
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