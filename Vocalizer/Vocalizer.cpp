#include "pch.h"

using namespace System;
using namespace System::Speech::Synthesis;

int main(array<System::String^>^ args)
{
    if (args->Length != 1)
    {
        Console::WriteLine(gcnew System::String("Expected exactly one argument, received " + args->Length));
        return 1;
    }

    SpeechSynthesizer speaker;
    speaker.Rate = 1;
    speaker.Volume = 100;
    speaker.Speak(args[0]);

    return 0;
}