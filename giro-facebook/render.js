// Uso: node giro-facebook/render.js piezas.json salida/AAAA-MM-DD
// piezas.json: lista de {titulo, detalle, outlet, clipText, cardStyle, person, band, tint}
const fs = require('fs');
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }

const [specPath, outDir] = process.argv.slice(2);
if (!specPath || !outDir) { console.error('Uso: node render.js piezas.json carpeta_salida'); process.exit(1); }
const piezas = JSON.parse(fs.readFileSync(specPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('file://' + path.resolve(__dirname, 'generador.html'));
  await page.waitForTimeout(2500);
  for (let i = 0; i < piezas.length; i++) {
    const p = piezas[i];
    await page.click('#tmplChips button[data-id="collage"]');
    await page.selectOption('#size', '1080x1350');
    await page.fill('#numero', p.numero || '');           // vacío = sin número
    await page.fill('#titulo', p.titulo || '');
    await page.fill('#detalle', p.detalle || '');
    await page.fill('#outlet', p.outlet || '');
    await page.fill('#clipText', p.clipText || '');
    await page.selectOption('#cardStyle', p.cardStyle || 'sans');
    await page.selectOption('#tint', p.tint || 'amarillo');
    await page.selectOption('#underline', 'si');
    await page.click('#clearCollage');
    if (p.person && fs.existsSync(p.person)) await page.setInputFiles('#personPhoto', p.person);
    if (p.band && fs.existsSync(p.band)) await page.setInputFiles('#bandPhoto', p.band);
    if (p.clipShot && fs.existsSync(p.clipShot)) await page.setInputFiles('#clipShot', p.clipShot);
    await page.waitForTimeout(1500);
    const src = await page.evaluate(() => document.getElementById('out').src);
    const file = path.join(outDir, `pieza-${i + 1}.png`);
    fs.writeFileSync(file, Buffer.from(src.split(',')[1], 'base64'));
    const texto = [p.captionTitulo || p.titulo.replace(/\*/g, ''), '', (p.detalle || '').replace(/\*/g, '').replace(/\n+/g, ' '), '',
      'Cuéntenos en los comentarios qué opina.', 'Dele like y comparta para que más gente lo sepa.',
      'Suscríbase a Giro Hacia La Izquierda en YouTube.', '', '#Colombia #GiroHaciaLaIzquierda'].join('\n');
    fs.writeFileSync(path.join(outDir, `pieza-${i + 1}.txt`), p.mensaje || texto);
    console.log('listo', file);
  }
  await browser.close();
})();
