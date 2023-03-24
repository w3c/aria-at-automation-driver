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

    /**
     * Delete a registry key and all its subkeys / values.
     *
     * @param {HKEY} hKeyRoot - root key
     * @param {tstring} subKey - subKey to delete
     *
     * @returns {bool} true if successful, false if an error occurs
     */
    bool deleteNode(HKEY hKeyRoot, tstring subKey);
}
