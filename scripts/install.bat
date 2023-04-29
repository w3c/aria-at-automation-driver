.\Release\MakeVoice.exe || exit /b

:: Install the project's custom NVDA add-on.
::
:: This operation is somewhat fragile (in that it may be broken by future
:: releases of NVDA) because it assumes the location and format of the screen
:: reader's "add on" directory. Although it would be preferable to first
:: "package" the add-on and then install it using the same procedure as an
:: end-user, that approach requires manual interaction with a modal dialog and
:: is therefore inappropriate for the needs of this project.

set destination=%USERPROFILE%\AppData\Roaming\nvda\addons\nvda-configuration-server

IF EXIST %destination% rmdir /Q /S %destination% || exit /b

:: In some environments, the "mkdir" command may be capable of creating
:: non-existent intermediate directories in the input path. This is dependent
:: on the presence of "Command Extensions". Create each directory individually
:: to support environments where Command Extensions are not enabled.
mkdir %USERPROFILE%\AppData
mkdir %USERPROFILE%\AppData\Roaming
mkdir %USERPROFILE%\AppData\Roaming\nvda
mkdir %USERPROFILE%\AppData\Roaming\nvda\addons
mkdir %destination% || exit /b

xcopy /E /Y .\lib\nvda-configuration-server %destination% || exit /b

xcopy /E /Y .\lib\shared %destination%\shared\ || exit /b
