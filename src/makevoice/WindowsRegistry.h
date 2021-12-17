#pragma once
#include "tstring.h"

namespace WindowsRegistry
{
    struct RegistryPathParts
    {
        HKEY root;
        tstring rest;
    };

    HRESULT splitRegistryPath(TCHAR* path, RegistryPathParts* parts);
    bool deleteNode(HKEY hKeyRoot, tstring lpSubKey);
}