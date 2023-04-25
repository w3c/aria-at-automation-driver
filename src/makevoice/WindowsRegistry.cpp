#include "stdafx.h"
#include <strsafe.h>
#include <tchar.h>
#include <windows.h>
#include <winnt.h>
#include <winerror.h>
#include <winreg.h>
#include "WindowsRegistry.h"

namespace WindowsRegistry
{
    TCHAR* KEY_SEPARATOR = _T("\\");

    HRESULT splitRegistryPath(TCHAR* path, RegistryPathParts* parts)
    {
        tstring pathString(path);
        std::size_t index = pathString.find(KEY_SEPARATOR);

        if (index == std::string::npos)
        {
            return E_FAIL;
        }
        tstring rootString = pathString.substr(0, index);
        tstring rest = pathString.substr(index + 1);

        if (rootString == _T("HKEY_CLASSES_ROOT"))
        {
            parts->root = HKEY_CLASSES_ROOT;
        }
        else if (rootString == _T("HKEY_CURRENT_USER"))
        {
            parts->root = HKEY_CURRENT_USER;
        }
        else if (rootString == _T("HKEY_LOCAL_MACHINE"))
        {
            parts->root = HKEY_LOCAL_MACHINE;
        }
        else if (rootString == _T("HKEY_USERS"))
        {
            parts->root = HKEY_USERS;
        }
        else if (rootString == _T("HKEY_CURRENT_CONFIG"))
        {
            parts->root = HKEY_CURRENT_CONFIG;
        }
        else
        {
            return E_FAIL;
        }

        parts->rest = rest;

        return S_OK;
    }

    // Based on https://docs.microsoft.com/en-us/windows/win32/sysinfo/deleting-a-key-with-subkeys
    bool deleteNode(HKEY hKeyRoot, tstring subKey)
    {
        LONG lResult;
        DWORD dwSize;
        TCHAR szName[MAX_PATH];
        HKEY hKey;
        FILETIME ftWrite;

        // Delete the key immediately, if possible.
        lResult = RegDeleteKey(hKeyRoot, subKey.c_str());

        if (lResult == ERROR_SUCCESS)
        {
            // The key was deleted.
            return TRUE;
        }

        // Open the key to walk its subkeys.
        lResult = RegOpenKeyEx(hKeyRoot, subKey.c_str(), 0, KEY_READ, &hKey);

        if (lResult != ERROR_SUCCESS)
        {
            return lResult == ERROR_FILE_NOT_FOUND;
        }

        // Delete each member of hKey.
        do
        {
            dwSize = MAX_PATH;
            lResult = RegEnumKeyEx(hKey, 0, szName, &dwSize, NULL, NULL, NULL, &ftWrite);
        } while (lResult == ERROR_SUCCESS && deleteNode(hKeyRoot, subKey + KEY_SEPARATOR + szName));

        RegCloseKey(hKey);

        // Try again to delete the key.
        lResult = RegDeleteKey(hKeyRoot, subKey.c_str());

        return lResult == ERROR_SUCCESS;
    }
}
