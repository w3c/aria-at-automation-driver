# Contribution Guidelines

## Requirements

- Microsoft Visual Studio 2019 with the following extensions included via the
  Visual Studio Installer
  - "Workloads"
    - "Desktop development with C++"
  - "Individual components"
    - "C++/CLI support for v142 build tools (Latest)"
    - "MSVC v142 - VS 2019 C++ ARM64 build tools (Latest)"
    - .NET Framework 4.6.1 SDK
    - .NET Framework 4.6.1 targeting pack

<details>
  <summary>note for project maintainers</summary>

The Visual Studio extensions are required to build the "Vocalizer.exe"
application.

</details>

Some screen readers may not recognize text-to-speech voices built for 32-bit
architectures, while others may not recognize those build for 64-bit
architectures. [In the maintainers'
experience](https://github.com/w3c/aria-at-automation-driver/issues/22), NVDA
version 2023.1 recognizes only text-to-speech voices built for 32-bit
architectures.

## Code of Conduct

We also ask that you read our [Code of Conduct](CODE_OF_CONDUCT.md) before
contributing, and follow the expectations and spirit of that document in the
course of making your contribution.
