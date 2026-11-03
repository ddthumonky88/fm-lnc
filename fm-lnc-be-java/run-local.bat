@echo off
setlocal

cd /d "%~dp0"

set "JAVA_HOME=C:\Users\ADMIN\AppData\Local\Temp\fm-lnc-jdk21-full\jdk-21.0.13+9"
set "MAVEN_HOME=C:\Users\ADMIN\AppData\Local\Temp\fm-lnc-maven\apache-maven-3.9.9"

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo ERROR: JDK 21 not found at:
    echo %JAVA_HOME%
    pause
    exit /b 1
)

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo ERROR: Maven not found at:
    echo %MAVEN_HOME%
    pause
    exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"
set "DB_HOST=127.0.0.1"
set "DB_PORT=5432"
set "DB_USERNAME=postgres"
set "DB_PASSWORD=123456"
set "DB_NAME=fm_lnc_db"
set "LNC_FILES_DIR=%~dp0data"

echo Starting FM24 LNC Java Backend...
echo Project: %~dp0
echo Java:   %JAVA_HOME%
echo Maven:  %MAVEN_HOME%
echo LNC:    %LNC_FILES_DIR%
echo Swagger: http://localhost:3001/docs
echo.

call "%MAVEN_HOME%\bin\mvn.cmd" spring-boot:run

set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo Backend stopped with exit code %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%
