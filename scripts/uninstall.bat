.\Release\MakeVoice.exe /u || exit /b

rmdir /Q /S %USERPROFILE%\AppData\Roaming\nvda\addons\nvda-configuration-server || exit /b
