#pragma once

#include "resource.h"

#include <cstdarg>
#include <string>
#include <windows.h>

enum class MessageType {
    LIFECYCLE,
    SPEECH,
    ERR
};

void log(HANDLE handle, const wchar_t* format ...);

HRESULT emit(MessageType type, std::string data);

class Logger {
public:
    Logger();
    Logger(const wchar_t* fileName);
    ~Logger();

    Logger& operator=(Logger& other);

    void log(const wchar_t* format...);

    std::wstring systemMessage(DWORD message);

private:
    wchar_t* filePath;
    HANDLE m_handle;
};
