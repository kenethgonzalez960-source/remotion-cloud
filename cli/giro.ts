#!/usr/bin/env tsx
import {parseArgs} from 'node:util';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Hechos} from './esquema';
import {hayErrores, validarHechos, type Hallazgo} from './reglas';
import {resolverFoto} from './wikimedia';
import {respaldo, textoDelDia, textoPublicacion, type FotoResuelta} from './salida';
import {renderizar} from './render';
import {publicarFoto} from './facebook';
import type {CollageProps} from '../src/collage/Collage';

const CONFIG = 'config/estrategia-giro-nube.json';
const AYUDA = `giro: fábrica de piezas para "Giro Hacia La Izquierda"

  giro validar  <hechos.json> [--numerar]     Revisa las reglas editoriales (no genera nada)
  giro generar  <hechos.json> [--numerar]     Valida, busca fotos libres, renderiza PNG, texto.txt y respaldo.md
  giro publicar <hechos.json> [--dry-run]     Publica en Facebook solo si el modo del config es "publicar"
  giro ejemplo                                 Escribe ejemplos/hechos-ejemplo.json (datos ficticios, no publicable)
`;

const leerJson = async (f: string) => JSON.parse(await readFile(f, 'utf8'));
const config = async () => leerJson(CONFIG);

async function cargar(f: string, numerar: boolean) {
  const hechos = Hechos.parse(await leerJson(f));
  const hallazgos = validarHechos(hechos, {numerar});
  return {hechos, hallazgos};
}

function imprimir(h: Hallazgo[]) {
  if (!h.length) return console.log('Sin hallazgos. Todas las reglas pasan.');
  for (const x of h) console.log(`${x.nivel === 'error' ? 'ERROR' : 'aviso'}  pieza ${x.pieza === null ? '-' : x.pieza + 1}  [${x.regla}] ${x.mensaje}`);
}

const hashtags = (cfg: any) => '#Colombia #GiroHaciaLaIzquierda';

async function generar(archivo: string, numerar: boolean) {
  const cfg = await config();
  const {hechos, hallazgos} = await cargar(archivo, numerar);
  imprimir(hallazgos);
  if (hayErrores(hallazgos)) throw new Error('Hay errores editoriales; corríjalos antes de generar.');

  const dir = path.join('salida', hechos.fecha);
  await mkdir(dir, {recursive: true});
  const fotos: FotoResuelta[] = [];
  for (const [i, p] of hechos.piezas.entries()) {
    try { fotos.push(await resolverFoto(p)); }
    catch (e) { console.warn(`aviso  pieza ${i + 1}: no se pudo obtener foto (${(e as Error).message}); se usa el formato sin persona.`); fotos.push(null); }
  }
  const trabajos = hechos.piezas.map((p, i) => ({
    destino: path.join(dir, `pieza-${i + 1}.png`),
    props: {
      numero: p.numero, titulo: p.titulo, apoyo: p.apoyo, recorteTitular: p.recorte.titular, recorteMedio: p.recorte.medio,
      foto: fotos[i]?.dataUri ?? null, tono: p.tono, canal: cfg.entradas.canal,
    } satisfies CollageProps,
  }));
  await renderizar(trabajos);
  await writeFile(path.join(dir, 'texto.txt'), textoDelDia(hechos, hashtags(cfg)));
  await writeFile(path.join(dir, 'respaldo.md'), respaldo(hechos, fotos));
  console.log(`Listo en ${dir}/: ${hechos.piezas.length} PNG, texto.txt y respaldo.md (modo: ${cfg.modo_publicacion.actual}).`);
}

async function publicar(archivo: string, dry: boolean) {
  const cfg = await config();
  if (cfg.modo_publicacion.actual !== 'publicar')
    throw new Error(`El modo es "${cfg.modo_publicacion.actual}". Cambie modo_publicacion.actual a "publicar" para publicar directo; mientras tanto apruebe y suba las piezas desde Meta Business Suite.`);
  const {hechos, hallazgos} = await cargar(archivo, false);
  if (hechos.ejemplo) throw new Error('Los archivos de ejemplo no se publican.');
  if (hayErrores(hallazgos)) { imprimir(hallazgos); throw new Error('Hay errores editoriales; no se publica.'); }
  for (const [i, p] of hechos.piezas.entries()) {
    const png = path.join('salida', hechos.fecha, `pieza-${i + 1}.png`);
    const msg = textoPublicacion(p, hashtags(cfg));
    if (dry) { console.log(`[dry-run] publicaría ${png}\n${msg}\n`); continue; }
    console.log(`Publicada pieza ${i + 1}: ${await publicarFoto(png, msg)}`);
  }
}

async function main() {
  const {positionals, values} = parseArgs({allowPositionals: true, options: {numerar: {type: 'boolean', default: false}, 'dry-run': {type: 'boolean', default: false}}});
  const [cmd, archivo] = positionals;
  if (cmd === 'validar' && archivo) { const {hallazgos} = await cargar(archivo, values.numerar!); imprimir(hallazgos); process.exitCode = hayErrores(hallazgos) ? 1 : 0; }
  else if (cmd === 'generar' && archivo) await generar(archivo, values.numerar!);
  else if (cmd === 'publicar' && archivo) await publicar(archivo, values['dry-run']!);
  else if (cmd === 'ejemplo') { await mkdir('ejemplos', {recursive: true}); console.log('Ya existe ejemplos/hechos-ejemplo.json'); }
  else console.log(AYUDA);
}

main().catch((e) => { console.error(`Error: ${e instanceof Error ? e.message : e}`); process.exit(1); });
