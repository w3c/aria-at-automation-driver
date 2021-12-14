#include "pch.h"
#include "..\Shared\branding.h"
#include <cstdlib>

using namespace System;
using namespace System::Speech::Synthesis;
using namespace System::Text::RegularExpressions;

/**
 * A process which vocalizes text data supplied as input via the environment
 * variable named "WORDS". Although the process's command-line arguments are
 * the more traditional method for providing input, the use of an environment
 * variable circumvents the character escaping concerns that are typical for
 * Windows processes.
 * https://docs.microsoft.com/en-us/archive/blogs/twistylittlepassagesallalike/everyone-quotes-command-line-arguments-the-wrong-way
 */
int main(array<System::String^>^ args)
{
    char* words = getenv("WORDS");
    if (words == NULL)
    {
        Console::WriteLine(gcnew System::String(
            "Expected the environment variable WORDS to be set, but it was not set."
        ));
        return 1;
    }
    Console::WriteLine(gcnew System::String(words));
    SpeechSynthesizer speaker;
    speaker.Rate = 1;
    speaker.Volume = 100;

    // The Vocalizer component is intended to sonically convey text to a human
    // operator, and the Automation Voice is inappropriate for this purpose. In
    // addition, the use of the Automation Voice in this context could trigger
    // non-recoverable recursion.
    //
    // By default, the SpeechSynthesizer instance declared above will use the
    // system's default voice. Explicitly set the instance's voice to any
    // available value other than the Automation Voice in order to avoid
    // problems in cases where the system has designated the Automation Voice
    // as the "default" voice.
    if (speaker.Voice->Name == AUTOMATION_VOICE_NAME)
    {
        for each (InstalledVoice^ voice in speaker.GetInstalledVoices())
        {
            if (voice->VoiceInfo->Name != AUTOMATION_VOICE_NAME)
            {
                speaker.SelectVoice(voice->VoiceInfo->Name);
                break;
            }
        }
        if (speaker.Voice->Name == AUTOMATION_VOICE_NAME)
        {
            Console::WriteLine(gcnew System::String(
                "Unable to locate an authentic voice."
            ));
            return 1;
        }
    }

    speaker.Speak(gcnew System::String(words));

    return 0;
}