@echo off
rem ==========================================================================
rem  DreamWeaver - one-click publish to GitHub (Windows)
rem  ---------------------------------------------------------------
rem  Why this file exists: Windows blocks .ps1 scripts by default
rem  ("running scripts is disabled on this system"). This wrapper calls
rem  PowerShell with -ExecutionPolicy Bypass for THIS run only, so it
rem  works without changing any system setting.
rem
rem  Usage (in this folder):
rem      publish.cmd -Repo https://github.com/<you>/<repo>.git
rem
rem  In automation / CI, set DW_NOPAUSE=1 so it never waits for a keypress.
rem
rem  Keep the text in this .cmd ASCII-only: a Chinese console codepage
rem  would garble it. All Chinese messages come from publish.ps1 (UTF-8 BOM).
rem ==========================================================================
setlocal
cd /d "%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
  echo [!] PowerShell not found. Please install Windows PowerShell.
  goto :hold
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish.ps1" %*
set RC=%ERRORLEVEL%

if not "%RC%"=="0" (
  echo.
  echo [!] Publish did not finish ^(exit %RC%^). See the messages above.
)

:hold
rem Only wait for a key when a human double-clicked this file (or ran it in a
rem console we do not own). DW_NOPAUSE=1 skips it for scripts.
if defined DW_NOPAUSE exit /b %RC%
echo %cmdcmdline% | find /i "%~nx0" >nul
if errorlevel 1 exit /b %RC%
echo.
pause
exit /b %RC%
