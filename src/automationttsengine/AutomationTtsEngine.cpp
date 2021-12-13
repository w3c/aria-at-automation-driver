// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright © Microsoft Corporation. All rights reserved

// AutomationTtsEngine.cpp : Implementation of DLL Exports.

#include "stdafx.h"
#include "resource.h"
#include <initguid.h>
#include "AutomationTtsEngine.h"
#include "AutomationTtsEngine_i.c"
#include "TtsEngObj.h"
#include "ttsengutil.h"

CComModule _Module;

Logger dllLogger(L"dll.txt");

BEGIN_OBJECT_MAP(ObjectMap)
    OBJECT_ENTRY( CLSID_SampleTTSEngine   , CTTSEngObj    )
END_OBJECT_MAP()

/////////////////////////////////////////////////////////////////////////////
// DLL Entry Point

#ifdef _WIN32_WCE
extern "C" BOOL WINAPI DllMain(HANDLE hInstance, ULONG dwReason, LPVOID)
#else
extern "C" BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID /*lpReserved*/)
#endif
{
    dllLogger.log(L"DllMain()\n");
    if (dwReason == DLL_PROCESS_ATTACH)
    {
        _Module.Init(ObjectMap, (HINSTANCE)hInstance, &LIBID_SAMPLETTSENGLib);
        dllLogger.log(L"Module.Init()\n");
    }
    else if (dwReason == DLL_PROCESS_DETACH) {
        _Module.Term();
        dllLogger.log(L"Module.Term()\n");
    }
    return TRUE;    // ok
}

/////////////////////////////////////////////////////////////////////////////
// Used to determine whether the DLL can be unloaded by OLE

STDAPI DllCanUnloadNow(void)
{
    dllLogger.log(L"DllCanUnloadNow()\n");
    return (_Module.GetLockCount()==0) ? S_OK : S_FALSE;
}

/////////////////////////////////////////////////////////////////////////////
// Returns a class factory to create an object of the requested type

STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID* ppv)
{
    dllLogger.log(L"Module.GetClassObject()\n");
    return _Module.GetClassObject(rclsid, riid, ppv);
}

/////////////////////////////////////////////////////////////////////////////
// DllRegisterServer - Adds entries to the system registry

STDAPI DllRegisterServer(void)
{
    dllLogger.log(L"Module.RegisterServer()\n");
    // registers object, typelib and all interfaces in typelib
    return _Module.RegisterServer(TRUE);
}

/////////////////////////////////////////////////////////////////////////////
// DllUnregisterServer - Removes entries from the system registry

STDAPI DllUnregisterServer(void)
{
    dllLogger.log(L"Module.UnregisterServer()\n");
    return _Module.UnregisterServer(TRUE);
}




