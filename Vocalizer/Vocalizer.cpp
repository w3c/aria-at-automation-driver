#include "pch.h"
#include <cstdlib>

using namespace System;
using namespace System::Speech::Synthesis;

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
    speaker.Speak(gcnew System::String(words));

    return 0;
}