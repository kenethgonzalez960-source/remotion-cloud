#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instale Node.js desde https://nodejs.org y vuelva a abrir este archivo."; read -n1; exit 1; }
[ -d node_modules ] || { echo "Instalando por primera vez, espere..."; npm install; }
[ -f .chromium-ok ] || { echo "Instalando el navegador de dibujo, espere..."; npx playwright install chromium && touch .chromium-ok; }
npx tsx app/server.ts
