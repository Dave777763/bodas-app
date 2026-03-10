@echo off
setlocal
title Iniciar EventosApp - Servidor Local

echo ==========================================
echo    Iniciando Servidor Local (EventosApp)
echo ==========================================
echo.

REM 1. Verificar si estamos en la raíz o en frontend
if exist "frontend" (
    cd frontend
) else if not exist "package.json" (
    echo [ERROR] No se encuentra la carpeta 'frontend' ni 'package.json'.
    echo Por favor, ejecuta este archivo desde la carpeta raiz del proyecto.
    pause
    exit /b 1
)

REM 2. Verificar dependencias
if not exist "node_modules" (
    echo [INFO] No se detectaron dependencias. Instalando...
    call npm install
)

REM 3. Verificar Archivo de Entorno
if not exist ".env.local" (
    echo [ALERTA] No se encontro el archivo .env.local.
    if exist ".env.example" (
        echo [INFO] Creando .env.local basandose en .env.example...
        copy .env.example .env.local
        echo [IMPORTANTE] Por favor, edita .env.local con tus credenciales de Firebase.
    ) else (
        echo [ERROR] No se encontro ni .env.local ni .env.example.
    )
    pause
)

echo.
echo [INFO] Optimizando compilacion...
echo [INFO] El servidor estara disponible en: http://localhost:3000
echo.

REM Ejecutar servidor en segundo plano y abrir navegador
start /min cmd /c "timeout /t 8 >nul & start http://localhost:3000/dashboard"

echo [OK] Servidor iniciado correctamente.
echo.
echo TIP: Si no ves la camara en una invitacion, asegurate de:
echo 1. Estar usando un link valido del Dashboard local.
echo 2. Haber "Confirmado" la asistencia en esa invitacion.
echo 3. Tu navegador debe permitir el acceso a la camara en localhost.
echo.

call npm run dev
pause
