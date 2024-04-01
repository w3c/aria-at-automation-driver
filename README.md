# ARIA-AT Automation Driver

A [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
server which allows clients to observe the text enunciated by a screen reader
and to simulate user input

**[aria-at-automation](https://github.com/w3c/aria-at-automation)** &middot; [aria-at-automation-harness](https://github.com/w3c/aria-at-automation-harness) &middot; aria-at-automation-driver &middot; [aria-at-automation-results-viewer](https://github.com/w3c/aria-at-automation-results-viewer)

## Requirements

- Microsoft Windows
- [Node.js](https://nodejs.org), including "Tools for Native Modules" as
  offered by the Node.js installer
- [the Microsoft Visual C++
  runtime](https://aka.ms/vs/16/release/vc_redist.x86.exe)

<details>
  <summary>note for project maintainers</summary>

"Tools for Native Modules" is required to install the "robotjs" npm module,
which is a dependency of this project.

[The Visual C++ runtime includes
`VCRUNTIME140.dll`](https://answers.microsoft.com/en-us/windows/forum/all/vcruntime140dll/fc4c0470-4db0-4e7b-9537-58ea62f8ac05),
which is required by the automation voice.

</details>

## Installation

1. Install the project by executing the following command:

       npm install -g @bocoup/windows-sapi-tts-engine-for-automation

2. Run the install command in a terminal:

       at-driver install

   If prompted for system administration permission, grant permission.

3. Start the server by executing the following command in a terminal:

       at-driver serve

   The process will write a message to the standard error stream when the
   WebSocket server is listening for connections. The `--help` flag will cause
   the command to output advanced usage instructions (e.g. `at-driver --help`).

4. Configure any screen reader to use the synthesizer named "Microsoft Speech
   API version 5" and the text-to-speech voice named "Bocoup Automation Voice."

5. Use any WebSocket client to connect to the server. The protocol is described
   below. (The server will print protocol messages to its standard error stream
   for diagnostic purposes only. Neither the format nor the availability of
   this output is guaranteed, making it inappropriate for external use.)

## Terminology

- **message** - a [JSON](https://www.json.org)-formatted string that describes
  some occurrence of interest, emitted at the moment it occurred; the message
  should be a JSON object value with two string properties: `type` and `data`
- **message type** - one of `"lifecycle"`, `"speech"`, or `"error"`
  - `"lifecycle"` - signifies that the message data is an expected lifecycle of
    the automation voice (e.g. initialization and destruction)
  - `"speech"` - signifies that the message data is text which a screen reader
    has requested the operating system annunciate
  - `"error"` - signifies that an exceptional circumstances has occurred
- **message data** - information which refines the meaning of the message type

## Protocol

This project implements [AT Driver](https://w3c.github.io/at-driver/), a
protocol published in 2024 as [a W3C Draft Community Group
Report](https://www.w3.org/standards/types/#CG-DRAFT). That document
exhaustively describes the JSON-encoded WebSocket protocol. Please [file a bug
report against this
project](https://github.com/w3c/aria-at-automation-driver/issues/new) if you
observe any discrepencies with AT Driver.

## Architecture

This tool is comprised of two main components: a text-to-speech voice and a
WebSocket server.

### Text-to-speech voice

The text-to-speech voice is written in C++ and integrates with the [Microsoft
Speech API
(SAPI)](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/ee125663(v=vs.85)).
Because it interfaces with the Windows operating system (that is: "below" the
screen reader in the metaphorical software stack), it can observe speech from
many screen readers without coupling to any particular screen reader.

The voice has two responsibilities. First, it emits the observed speech data
and related events to a [Windows named
pipe](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes). This
allows the second component to present a robust public interface for
programmatic consumption of the data. (The named pipe is an implementation
detail. Neither its content nor its presence is guaranteed, making it
inappropriate for external use.)

Second, the voice annunciates speech data. It does this by forwarding speech
data to the system's default text-to-speech voice. This ensures that a system
configured to use the voice remains accessible to screen reader users.

### WebSocket server

The WebSocket server is written in Node.js and allows an arbitrary number of
clients to observe events on a standard interface. It has been designed as an
approximation of an interface that may be exposed directly by screen readers in
the future.

## Contribution Guidelines

For details on contributing to this project, please refer to the file named
`CONTRIBUTING.md`.

## License

Licensed under the terms of the MIT Expat License; the complete text is
available in the LICENSE file.

Copyright for portions of AT Driver are held by Microsoft as part of the
"Sample Text-to-Speech Engine and MakeVoice" project. All other copyright for
AT Driver are held by Bocoup.

---

### [aria-at-automation](https://github.com/w3c/aria-at-automation)

A collection of projects for automating assistive technology tests from [w3c/aria-at](https://github.com/w3c/aria-at) and beyond

**[aria-at-automation-harness](https://github.com/w3c/aria-at-automation-harness)**  
A command-line utility for executing test plans from [w3c/aria-at](https://github.com/w3c/aria-at) without human intervention using [the aria-at-automation-driver](https://github.com/w3c/aria-at-automation-driver)

**aria-at-automation-driver**  
A WebSocket server which allows clients to observe the text enunciated by a screen reader and to simulate user input

**[aria-at-automation-results-viewer](https://github.com/w3c/aria-at-automation-results-viewer)**  
A tool which translates the JSON-formatted data produced by the [aria-at-automation-harness](https://github.com/w3c/aria-at-automation-harness) into a human-readable form
