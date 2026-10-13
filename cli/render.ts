import path from 'node:path';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import type {Pieza} from './esquema';
import type {FotoResuelta} from './salida';

const GENERADOR = path.resolve(__dirname, '../giro-facebook/generador.html');

/** Chromium ya instalado en el equipo; si no hay uno, Playwright usa el suyo (npx playwright install chromium). */
export function navegador(): string | undefined {
  const candidatos = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'];
  return candidatos.find((c): c is string => !!c && existsSync(c));
}

export type Trabajo = {pieza: Pieza; foto: FotoResuelta; destino: string; canal: string};

const sinNumero = (n: string) => n; // el campo número va vacío salvo que se pida

/** Dibuja cada pieza con el generador de la fábrica (plantilla "Collage de recortes", 1080x1350). */
export async function renderizar(trabajos: Trabajo[]): Promise<void> {
  const browser = await chromium.launch({executablePath: navegador()});
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 900}});
    await page.goto('file://' + GENERADOR);
    await page.waitForTimeout(2500);
    // El generador corta en silencio los campos con maxlength (200): un texto truncado no puede salir.
    await page.evaluate(() => document.querySelectorAll('[maxlength]').forEach((e) => e.removeAttribute('maxlength')));
    for (const {pieza: p, foto, destino, canal} of trabajos) {
      await page.click('#tmplChips button[data-id="collage"]');
      await page.selectOption('#size', '1080x1350');
      await page.fill('#canal', canal);
      await page.fill('#numero', sinNumero(p.numero));
      await page.fill('#titulo', p.titulo);
      await page.fill('#detalle', p.apoyo.join('\n\n'));
      await page.fill('#outlet', p.recorte.medio);
      await page.fill('#clipText', p.recorte.titular);
      await page.selectOption('#cardStyle', 'sans');
      await page.selectOption('#tint', p.tono);
      await page.selectOption('#underline', 'si');
      await page.click('#clearCollage');
      if (foto) {
        const [meta, b64] = foto.dataUri.split(',');
        const mimeType = meta.slice(5, meta.indexOf(';'));
        await page.setInputFiles('#personPhoto', {name: 'persona.jpg', mimeType, buffer: Buffer.from(b64, 'base64')});
      }
      await page.waitForTimeout(1500);
      for (const [id, esperado] of [['titulo', p.titulo], ['detalle', p.apoyo.join('\n\n')], ['outlet', p.recorte.medio], ['clipText', p.recorte.titular]] as const) {
        const real = await page.inputValue('#' + id);
        if (real !== esperado) throw new Error(`El campo "${id}" quedó distinto de lo escrito (¿texto cortado?). No se genera la imagen.`);
      }
      const src = await page.evaluate(() => (document.getElementById('out') as HTMLImageElement).src);
      if (!src.startsWith('data:image/png')) throw new Error('El generador no produjo la imagen.');
      await mkdir(path.dirname(destino), {recursive: true});
      await writeFile(destino, Buffer.from(src.split(',')[1], 'base64'));
    }
  } finally {
    await browser.close();
  }
}
