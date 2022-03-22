# "vendor" files

This directory contains files which are derived from externally-maintained
projects.

- `robotjs.node` - a native Node.js module for the Windows x64 platform;
  source: [the Robot.js Node.js module](https://github.com/octalmage/robotjs);
  included in this repository because [the module cannot be installed using
  current releases of npm](https://github.com/octalmage/robotjs/pull/622).
  Additionally, a compiled version of the latest release was not included in
  the latest release, forcing consumers to install Windows platform development
  tools in order to compile it locally. This binary has been built from [an
  alternate version of the Robot.js source
  code](https://github.com/octalmage/robotjs/pull/697) (patched to support the
  [Node-API](https://nodejs.org/api/n-api.html)) and included in this project
  to enable continued prototyping.
