@echo off
setlocal
title Configurar Proyecto - EventosApp

echo ==========================================
echo    Configuracion de App de Eventos (EventosApp)
echo ==========================================
echo.

REM 1. Verificar Node.js
echo [1/3] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Node.js NO ESTA INSTALADO.
    echo.
    echo Por favor instala Node.js primero: https://nodejs.org
    pause
    exit /b 1
)
echo Node.js detectado exitosamente.
echo.

REM 2. Entrar a la carpeta frontend
if not exist "frontend" (
    echo [ALERTA] No se encuentra la carpeta 'frontend'. 
    echo Asegurate de estar en la carpeta raiz del proyecto.
    pause
    exit /b 1
)
cd frontend

REM 3. Instalar dependencias necesarias
echo [2/3] Instalando dependencias necesarias (esto puede tardar unos minutos)...
echo.
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron instalar las dependencias con npm install.
    echo Intentando con npm install --legacy-peer-deps...
    call npm install --legacy-peer-deps
)

REM 4. Verificar Archivo de Entorno
echo.
echo [3/3] Verificando archivo de entorno...
if not exist ".env.local" (
    if exist ".env.example" (
        echo [INFO] Generando el archivo .env.local basandose en .env.example...
        copy .env.example .env.local
        echo [OK] Archivo .env.local creado. No olvides editarlo con tus credenciales.
    ) else (
        echo [ALERTA] No se encontro ni .env.local ni .env.example.
    )
) else (
    echo [OK] El archivo .env.local ya existe.
)

echo.
echo ==========================================
echo    Configuracion Completada Exitosamente!
echo ==========================================
echo.
echo Ahora puedes iniciar la aplicacion ejecutando:
echo > iniciar_app.bat
echo.
pause
