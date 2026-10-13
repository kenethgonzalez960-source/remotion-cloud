import path from 'node:path';
import {existsSync} from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import type {CollageProps} from '../src/collage/Collage';

/** Chromium de Playwright (headless shell) si existe; si no, el que descargue Remotion. */
export function navegador(): string | null {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  for (const d of ['chromium_headless_shell-1194/chrome-linux/headless_shell']) {
    const f = path.join(base, d);
    if (existsSync(f)) return f;
  }
  return null;
}

export async function renderizar(piezas: {props: CollageProps; destino: string}[]): Promise<void> {
  const serveUrl = await bundle({entryPoint: path.resolve(__dirname, '../src/index.ts')});
  const browserExecutable = navegador();
  for (const {props, destino} of piezas) {
    const composition = await selectComposition({serveUrl, id: 'Collage', inputProps: props, browserExecutable, chromiumOptions: {gl: 'swangle'}});
    await renderStill({composition, serveUrl, output: destino, inputProps: props, imageFormat: 'png', browserExecutable, chromiumOptions: {gl: 'swangle'}});
  }
}
