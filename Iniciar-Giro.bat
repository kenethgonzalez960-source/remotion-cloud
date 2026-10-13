@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Instale Node.js desde https://nodejs.org y vuelva a abrir este archivo. & pause & exit /b)
if not exist node_modules (echo Instalando por primera vez, espere... & call npm install)
call npx tsx app/server.ts
pause
