
#include "stdafx.h"
#include "ttsengutil.h"

#include <windows.h>
#include <cstdarg>
#include <string.h>
#include <strsafe.h>
#include <ctime>
#include <stdlib.h>

wchar_t logBuffer[4096];

void log(HANDLE handle, const wchar_t* format, va_list args) {
    va_list args2;
    va_copy(args2, args);
    StringCchVPrintfW(logBuffer, 4096, format, args);
    vfwprintf(stderr, format, args);
    auto l = wcslen(logBuffer);
    WriteFile(handle, logBuffer, l * sizeof(wchar_t), NULL, NULL);
}

void log(HANDLE handle, const wchar_t* format...) {
    va_list args;
    va_start(args, format);
    log(handle, format, args);
}

Logger emitLogger(L"emit.txt");

HRESULT emit(MessageType type, std::string data) {
    emitLogger.log(L"emit()\n");

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
        auto pipeError = GetLastError();

        emitLogger.log(L"Failed to connect to pipe. Error: %ls\n", emitLogger.systemMessage(pipeError).c_str());
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
        typeString = "internalError";
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
        emitLogger.log(L"Failed to send data.\n");
        return E_FAIL;
    }

    return S_OK;
}

Logger::Logger()
{
    Logger(L"log.txt");
}

wchar_t LOGGER_DIRECTORY[] = L"C:\\Program Files\\Bocoup Automation Voice\\";
wchar_t moduleFileName[2048];

Logger::Logger(const wchar_t* fileName)
{
    time_t now;
    time(&now);

    wchar_t* directoryPath = LOGGER_DIRECTORY;
    HMODULE hm;
    if (GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
        GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT, (LPCWSTR) &emit, &hm)) {
        if (GetModuleFileNameW(hm, moduleFileName, sizeof(moduleFileName))) {
            directoryPath = moduleFileName;
        }
    }

    auto directoryCharCount = wcslen(directoryPath);
    auto timeCharCount = 20;
    auto fileNameCharCount = wcslen(fileName);
    auto filePathCharCount = directoryCharCount + timeCharCount + 1 + fileNameCharCount + 1;
    auto filePathBytes = filePathCharCount * sizeof(wchar_t);
    filePath = (wchar_t *) LocalAlloc(LPTR, filePathBytes);
    //StringCchCatW(filePath, filePathCharCount, LOGGER_DIRECTORY);
    StringCchPrintfW(filePath, filePathCharCount, L"%ls%ld-", directoryPath, now);
    StringCchCatW(filePath, filePathCharCount, fileName);
    m_handle = CreateFileW(filePath, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

    log(L"Log opened: %ls.\n", filePath);

    //if (GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
    //    GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT, (LPCWSTR)&countFormatArgs, &hm) == 0) {
    //} else {
    //    log(L"Got Module Handle: %lp\n", hm);
    //    if (GetModuleFileNameW(hm, moduleFileName, sizeof(moduleFileName)) == 0) {
    //        log(L"Module: %ls\n", moduleFileName);
    //    }
    //}
}

Logger::~Logger()
{
    log(L"Closing.\n");

    CloseHandle(m_handle);
    LocalFree(filePath);
}

Logger& Logger::operator=(Logger& other)
{
    //log(L"Redirecting ...\n");
    CloseHandle(m_handle);
    m_handle = INVALID_HANDLE_VALUE;

    LocalFree(filePath);

    size_t filePathCharCount = wcslen(other.filePath) + 1;
    filePath = (wchar_t*)LocalAlloc(LPTR, filePathCharCount * sizeof(wchar_t));
    StringCchCopyW(filePath, filePathCharCount, other.filePath);

    m_handle = CreateFileW(filePath, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

    return *this;
}

void Logger::log(const wchar_t* format ...)
{
    if (m_handle != INVALID_HANDLE_VALUE) {
        va_list args;
        va_start(args, format);
        ::log(m_handle, format, args);
    }
}

wchar_t messageBuffer[2048];

std::wstring Logger::systemMessage(DWORD message) {
    FormatMessageW(
        FORMAT_MESSAGE_FROM_SYSTEM,
        NULL,
        message,
        0,
        messageBuffer,
        sizeof(messageBuffer),
        NULL
    );
    return std::wstring(messageBuffer);
}
