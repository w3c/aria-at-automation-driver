

/* this ALWAYS GENERATED file contains the definitions for the interfaces */


 /* File created by MIDL compiler version 8.01.0622 */
/* at Mon Jan 18 22:14:07 2038
 */
/* Compiler settings for AutomationTtsEngine.idl:
    Oicf, W1, Zp8, env=Win64 (32b run), target_arch=AMD64 8.01.0622 
    protocol : all , ms_ext, c_ext, robust
    error checks: allocation ref bounds_check enum stub_data 
    VC __declspec() decoration level: 
         __declspec(uuid()), __declspec(selectany), __declspec(novtable)
         DECLSPEC_UUID(), MIDL_INTERFACE()
*/
/* @@MIDL_FILE_HEADING(  ) */



/* verify that the <rpcndr.h> version is high enough to compile this file*/
#ifndef __REQUIRED_RPCNDR_H_VERSION__
#define __REQUIRED_RPCNDR_H_VERSION__ 500
#endif

#include "rpc.h"
#include "rpcndr.h"

#ifndef __RPCNDR_H_VERSION__
#error this stub requires an updated version of <rpcndr.h>
#endif /* __RPCNDR_H_VERSION__ */


#ifndef __AutomationTtsEngine_h__
#define __AutomationTtsEngine_h__

#if defined(_MSC_VER) && (_MSC_VER >= 1020)
#pragma once
#endif

/* Forward Declarations */ 

#ifndef __SampleTTSEngine_FWD_DEFINED__
#define __SampleTTSEngine_FWD_DEFINED__

#ifdef __cplusplus
typedef class SampleTTSEngine SampleTTSEngine;
#else
typedef struct SampleTTSEngine SampleTTSEngine;
#endif /* __cplusplus */

#endif 	/* __SampleTTSEngine_FWD_DEFINED__ */


/* header files for imported files */
#include "oaidl.h"
#include "ocidl.h"
#include "sapiddk.h"

#ifdef __cplusplus
extern "C"{
#endif 


/* interface __MIDL_itf_AutomationTtsEngine_0000_0000 */
/* [local] */ 

typedef struct VOICEITEM
    {
    LPCWSTR pText;
    ULONG ulTextLen;
    ULONG ulNumAudioBytes;
    BYTE *pAudio;
    } 	VOICEITEM;



extern RPC_IF_HANDLE __MIDL_itf_AutomationTtsEngine_0000_0000_v0_0_c_ifspec;
extern RPC_IF_HANDLE __MIDL_itf_AutomationTtsEngine_0000_0000_v0_0_s_ifspec;


#ifndef __SAMPLETTSENGLib_LIBRARY_DEFINED__
#define __SAMPLETTSENGLib_LIBRARY_DEFINED__

/* library SAMPLETTSENGLib */
/* [helpstring][version][uuid] */ 


EXTERN_C const IID LIBID_SAMPLETTSENGLib;

EXTERN_C const CLSID CLSID_SampleTTSEngine;

#ifdef __cplusplus

class DECLSPEC_UUID("A832755E-9C2A-40b4-89B2-3A92EE705852")
SampleTTSEngine;
#endif
#endif /* __SAMPLETTSENGLib_LIBRARY_DEFINED__ */

/* Additional Prototypes for ALL interfaces */

/* end of Additional Prototypes */

#ifdef __cplusplus
}
#endif

#endif


