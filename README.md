# AT Driver

A [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
server which exposes the speech being vocalized by various screen readers
running locally on a Microsoft Windows system.

## Requirements

- Microsoft Windows
- [Node.js](https://nodejs.org)

## Installation

1. Install the project by executing the following command:

       npm install -g at-driver

   If prompted for system administration permission, grant permission.

2. Start the server by executing the following command in a terminal:

       at-driver

   The `--help` flag will cause the command to output advanced usage
   instructions (e.g. `at-driver --help`).

3. Configure any screen reader to use the text-to-speech voice named "Bocoup
   Automation Voice."

4. Use any WebSocket client to connect to the server and observe speech and
   related events. (The server will print these messages to the standard error
   stream for diagnostic purposes only. Neither the format nor the availability
   of this output is guaranteed, making it inappropriate for external use.)

## Terminology

- **message** - a [JSON](https://www.json.org)-formatted string that describes
  some occurrence of interest, emitted at the moment it occurred; the message
  should be a JSON object value with two string properties: `type` and `data`
- **message type** - one of `"event"`, `"speech"`, or `"unknown"`
  - `"event"` - signifies that the message data is an expected lifecycle of the
    automation voice (e.g. initialization and destruction)
  - `"speech"` - signifies that the message data is text which a screen reader
    has requested the operating system annunciate
  - `"unknown"` - a fallback type used in exceptional circumstances where no
    type could be inferred; the use of this value reflects an error in the
    internals of this tool
- **message data** - information which refines the meaning of the message type

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

## License

Licensed under the terms of the MIT Expat License; the complete text is
available in the LICENSE file.

Copyright for portions of AT Driver are held by Microsoft as part of the
"Sample Text-to-Speech Engine and MakeVoice" project. All other copyright for
AT Driver are held by Bocoup.
