@echo off
TITLE BeeZen Worker Deployer
SET "NODE_PATH=C:\Users\simon.vernusse\Downloads\node-v24.13.1-win-x64\node-v24.13.1-win-x64"
SET "PATH=%NODE_PATH%;%PATH%"

echo [1/2] Connexion a Cloudflare...
echo Une fenetre de navigateur va s'ouvrir. Connectez-vous et autorisez l'acces.
call npx wrangler login

echo.
echo [2/2] Deploiement du Worker Proxy...
call npx wrangler deploy
echo.
echo Deploiement termine ! 
echo Copiez l'URL affichee (ex: https://beezen-proxy...workers.dev) 
echo dans votre fichier .env a la ligne VITE_WORKER_URL.
echo.
pause
