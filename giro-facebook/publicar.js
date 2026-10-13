// Uso: node giro-facebook/publicar.js salida/AAAA-MM-DD
// Necesita FB_PAGE_ID y FB_PAGE_TOKEN como variables de entorno (secretos del entorno).
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const id = process.env.FB_PAGE_ID, token = process.env.FB_PAGE_TOKEN;
const ver = process.env.FB_API_VERSION || 'v24.0';
if (!dir) { console.error('Falta la carpeta de salida'); process.exit(1); }
if (!id || !token) { console.error('Faltan FB_PAGE_ID o FB_PAGE_TOKEN: no se publica.'); process.exit(2); }
(async () => {
  const pngs = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
  for (const f of pngs) {
    const txtFile = path.join(dir, f.replace('.png', '.txt'));
    const form = new FormData();
    form.append('source', new Blob([fs.readFileSync(path.join(dir, f))], { type: 'image/png' }), f);
    form.append('message', fs.existsSync(txtFile) ? fs.readFileSync(txtFile, 'utf8') : '');
    form.append('published', 'true');
    form.append('access_token', token);
    const r = await fetch(`https://graph.facebook.com/${ver}/${id}/photos`, { method: 'POST', body: form });
    const j = await r.json();
    console.log(f, r.ok ? 'publicada' : 'ERROR', JSON.stringify(j));
    if (!r.ok) process.exitCode = 3;
  }
})();
