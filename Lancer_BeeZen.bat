@echo off
TITLE BeeZen Launcher
SET "NODE_PATH=C:\Users\simon.vernusse\Downloads\node-v24.13.1-win-x64\node-v24.13.1-win-x64"
SET "PATH=%NODE_PATH%;%PATH%"

echo [1/2] Nettoyage des processus existants...
taskkill /f /im node.exe >nul 2>&1

echo [2/2] Lancement du serveur BeeZen...
start "" http://localhost:5173
npm run dev
pause
