import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {Hechos} from './esquema';
import {hayErrores, validarHechos, type Hallazgo} from './reglas';
import {resolverFoto} from './wikimedia';
import {respaldo, textoDelDia, type FotoResuelta} from './salida';
import {renderizar} from './render';
import type {CollageProps} from '../src/collage/Collage';

export const RAIZ = path.resolve(__dirname, '..');
export const CONFIG = path.join(RAIZ, 'config/estrategia-giro-nube.json');
export const HASHTAGS = '#Colombia #GiroHaciaLaIzquierda';

export const leerConfig = async () => JSON.parse(await readFile(CONFIG, 'utf8'));

export type Log = (mensaje: string) => void;

/** Valida, busca fotos, renderiza PNG y escribe texto.txt y respaldo.md dentro de `dir`. */
export async function generarEnCarpeta(hechos: Hechos, dir: string, opts: {numerar: boolean; log: Log}): Promise<{hallazgos: Hallazgo[]; archivos: string[]}> {
  const {log} = opts;
  const cfg = await leerConfig();
  const hallazgos = validarHechos(hechos, {numerar: opts.numerar});
  for (const x of hallazgos) log(`${x.nivel === 'error' ? 'ERROR' : 'Aviso'} (pieza ${x.pieza === null ? '-' : x.pieza + 1}): ${x.mensaje}`);
  if (hayErrores(hallazgos)) throw new Error('Hay errores editoriales; corríjalos antes de generar.');

  await mkdir(dir, {recursive: true});
  const fotos: FotoResuelta[] = [];
  for (const [i, p] of hechos.piezas.entries()) {
    try { fotos.push(await resolverFoto(p)); }
    catch (e) { log(`Pieza ${i + 1}: no se pudo obtener foto (${(e as Error).message}); sale sin persona.`); fotos.push(null); }
  }
  const trabajos = hechos.piezas.map((p, i) => ({
    destino: path.join(dir, `pieza-${i + 1}.png`),
    props: {
      numero: p.numero, titulo: p.titulo, apoyo: p.apoyo, recorteTitular: p.recorte.titular, recorteMedio: p.recorte.medio,
      foto: fotos[i]?.dataUri ?? null, tono: p.tono, canal: cfg.entradas.canal,
    } satisfies CollageProps,
  }));
  log('Dibujando las imágenes…');
  await renderizar(trabajos);
  await writeFile(path.join(dir, 'texto.txt'), textoDelDia(hechos, HASHTAGS));
  await writeFile(path.join(dir, 'respaldo.md'), respaldo(hechos, fotos));
  await writeFile(path.join(dir, 'hechos.json'), JSON.stringify(hechos, null, 2));
  return {hallazgos, archivos: [...trabajos.map((t) => path.basename(t.destino)), 'texto.txt', 'respaldo.md']};
}
