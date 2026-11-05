@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "XML_FILE=%~1"
if not defined XML_FILE set "XML_FILE=%~dp0..\fm24.xml"

if not exist "%XML_FILE%" (
    echo ERROR: Khong tim thay file XML:
    echo %XML_FILE%
    echo.
    echo Cach dung: run-analyze-xml.bat [duong-dan-fm24.xml]
    exit /b 1
)

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
    echo ERROR: Khong tim thay Python 3 trong PATH.
    exit /b 1
)

echo Dang phan tich: %XML_FILE%
echo Thu muc bao cao: %~dp0fm24-report
echo.

"%PYTHON_EXE%" %PYTHON_ARGS% "%~dp0tools\analyze_fm24_xml.py" "%XML_FILE%" --bundle "%~dp0fm24-report" --samples 50
if errorlevel 1 exit /b %ERRORLEVEL%

echo.
echo Hoan tat:
echo - %~dp0fm24-report\summary.md
echo - %~dp0fm24-report\summary.json
echo - %~dp0fm24-report\changes.jsonl
exit /b 0
