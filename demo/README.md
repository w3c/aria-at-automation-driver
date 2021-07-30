# Windows Screen Reader/Browser Automated Test Demo

A prototype exploring how tests for screen readers might be run in unattended
environments.

## Getting started

Requirements:

- Windows 10
- [Node.js](https://nodejs.org/en/) version 14
- [NVDA](https://www.nvaccess.org/) version 2021.1

Install the "automation voice" for the Windows Speech API defined by the
repository containing this directory.

To run the tests, execute the following command in a terminal located in the
directory containing this document:

    npm start -- nvda

## Design

Although the target environment for this work is "unattended" (e.g. the
environment provided by the Microsoft Azure service), we are also interested in
learning if/how this approach could be used in local developer environments,
particularly those where the screen reader under test is in active use.

This prototype reconfigures the screen reader to use the "automation voice"
defined by the containing project. Because this voice does not produce audible
output, this change makes the current system unusable for the duration of the
test. The prototype re-launches the screen reader with the user settings once
testing is complete. Because the restoration is critical to continued
operation, it is handled by a very small dedicated process. This design reduces
the risk that unexpected failure will interrupt the restoration of the user's
screen reader.

The sequence of operations:

1. User starts the process by executing the appropriate command (documented
   above) in a terminal
2. The "wrapper" script exits the currently-running screen reader (if present)
3. The "wrapper" script starts a new screen reader instance, configured with
   the "automation voice" so that its behavior can be observed programmatically
4. The "wrapper" script starts the test runner
5. The test runner starts a web browser using [the W3c standard WebDriver
   protocol](https://www.w3.org/TR/webdriver/)
6. The test runner interprets test files. That is: it sends key presses to the
   operating system, and it receives the text that the screen reader under test
   has scheduled for vocalization.
7. The test runner reports the result of the test and exits
8. The "wrapper" script exits the currently-running screen reader
9. The "wrapper" script starts a new screen reader instance if it was running
   at the onset of this process

The following ASCII diagram describes the same operations graphically:

    $ npm start -- nvda                                               .      .
    .----------.                                                      | NVDA |
    | index.js |                                                      |      |
    |          |------------------------> exit ---------------------->|      |
    |          |                                                      '------'
    |          |                                                      .------.
    |          |------------> start with automation voice ----------->| NVDA |
    |          |   .----------.                 .         .           |      |   .---------.
    |          |-->|  run.js  |                 | Windows |           |      |   | Firefox |
    |          |   |          |-> key presses ->|         |---------->|      |-->|         |
    |          |   |          |<----- text <----|         |<-- text <-|      |<--|         |
    |          |   | (report) |                 '         '           |      |   '---------'
    |          |   '----------'                                       |      |
    |          |------------------------> exit ---------------------->|      |
    |          |                                                      '------'
    |          |                                                      .------.
    |          |-------------> start with user settings ------------->| NVDA |
    '----------'                                                      '      '

## Roadmap

- accessibility technology support
  - [x] NVDA on Windows
  - [ ] Narrator on Windows
  - [ ] JAWS on Windows
  - [ ] VoiceOver on macOS
- browser support
  - [x] Mozilla Firefox
  - [ ] Chromium
  - [ ] Google Chrome
  - [ ] Apple Safari
- vocalization of test status during testing

## License

Copyright (c) 2021 Mike Pennisi  
Licensed under the MIT license.
