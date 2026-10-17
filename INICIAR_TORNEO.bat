@echo off
chcp 65001 >nul
title Torneo TT - Sistema de Gestión de Tenis de Mesa
color 0b

:: Asegurar que el directorio de trabajo sea la carpeta donde está este archivo .bat
cd /d "%~dp0"

echo.
echo ===================================================================
echo     🏓 SISTEMA WEB DE TORNEOS DE TENIS DE MESA (LOCAL / RED LAN)
echo ===================================================================
echo.
echo  Iniciando servidor local sin necesidad de internet...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado en este equipo.
    echo Por favor instala Node.js desde https://nodejs.org/ para ejecutar el sistema.
    echo.
    pause
    exit /b
)

:: Abrir el navegador automáticamente después de 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Ejecutar el servidor Node.js
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El servidor se ha detenido con codigo de error %errorlevel%.
    pause
)
