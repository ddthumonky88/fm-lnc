@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PYTHON_EXE="
set "PYTHON_ARGS="
where python.exe >nul 2>nul && set "PYTHON_EXE=python"
if not defined PYTHON_EXE where py.exe >nul 2>nul && set "PYTHON_EXE=py" && set "PYTHON_ARGS=-3"
if not defined PYTHON_EXE (
    for /d %%P in ("%LocalAppData%\Programs\Python\Python3*") do (
        if exist "%%~fP\python.exe" set "PYTHON_EXE=%%~fP\python.exe"
    )
)

if not defined PYTHON_EXE (
    echo ERROR: Khong tim thay Python 3.
    exit /b 1
)

"%PYTHON_EXE%" %PYTHON_ARGS% "%~dp0xml-changes-api\app.py"
