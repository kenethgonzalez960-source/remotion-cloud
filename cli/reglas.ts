import type {Hechos, Pieza} from './esquema';

export type Hallazgo = {pieza: number | null; nivel: 'error' | 'aviso'; regla: string; mensaje: string};

const LICENCIAS_LIBRES = [/^cc0/i, /^cc[ -]by(?![ -]nc)(?![ -]nd)/i, /^public domain/i, /^dominio p[uú]blico/i, /^pd[ -]/i];
const VERBOS_DENUNCIA = /\b(denuncian|denuncia|denunci[óo]|seg[úu]n|la comunidad dice|aseguran|acusan|alegan)\b/i;
const PROHIBIDAS = [/desnudamos/i];

export const palabras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const oraciones = (t: string) => t.split(/(?<=[.!?])\s+/).filter((s) => s.trim());

export function licenciaLibre(l: string | undefined): boolean {
  return !!l && LICENCIAS_LIBRES.some((r) => r.test(l.trim()));
}

export function validarPieza(p: Pieza, i: number, opts: {numerar: boolean}): Hallazgo[] {
  const h: Hallazgo[] = [];
  const e = (regla: string, mensaje: string) => h.push({pieza: i, nivel: 'error', regla, mensaje});
  const a = (regla: string, mensaje: string) => h.push({pieza: i, nivel: 'aviso', regla, mensaje});
  const texto = [p.titulo, ...p.apoyo, p.recorte.titular].join(' ');

  // Dos fuentes distintas o un documento oficial.
  const medios = new Set(p.fuentes.map((f) => f.medio.trim().toLowerCase()));
  if (medios.size < 2 && !p.fuentes.some((f) => f.documento_oficial))
    e('dos-fuentes', 'Se necesitan al menos dos medios distintos o un documento oficial.');
  if (!p.fuentes.some((f) => f.url === p.recorte.url))
    e('recorte-en-fuentes', 'La URL del recorte debe estar entre las fuentes, para poder verificar el titular textual.');

  // Denuncias redactadas como denuncias.
  if (p.es_denuncia && !VERBOS_DENUNCIA.test(p.apoyo.join(' ')))
    e('denuncia', "Es una denuncia: el texto debe decir 'denuncian', 'según' o 'la comunidad dice'.");

  // Título: mayúsculas y una sola palabra clave entre asteriscos.
  const claves = p.titulo.match(/\*[^*]+\*/g) ?? [];
  if (claves.length !== 1) e('titulo-clave', 'El título necesita exactamente una palabra clave entre *asteriscos*.');
  if (p.titulo !== p.titulo.toUpperCase()) e('titulo-mayusculas', 'El título va en mayúsculas.');
  if (palabras(p.titulo) > 14) a('titulo-largo', 'Título de más de 14 palabras; puede no caber en la imagen.');

  // Texto de apoyo: lenguaje hablado, frases de 15 a 25 palabras.
  for (const par of p.apoyo)
    for (const o of oraciones(par)) {
      const n = palabras(o);
      if (n < 15 || n > 25) a('frase-longitud', `Frase de ${n} palabras (meta 15 a 25): "${o.slice(0, 50)}…"`);
    }

  for (const r of PROHIBIDAS) if (r.test(texto)) e('palabra-prohibida', `Contiene una palabra prohibida: ${r.source}`);
  if (/^\s*fuente\s*:/im.test([...p.apoyo].join('\n'))) e('sin-fuente-en-imagen', "No va línea 'Fuente:' dentro de la imagen.");

  // Numeración solo si el usuario la pide.
  if (p.numero !== '' && !opts.numerar) e('sin-numero', 'El campo número va vacío salvo que se pida con --numerar.');

  // Fotos libres con autor y licencia.
  if (p.foto) {
    if (!p.foto.archivo && !p.foto.buscar) e('foto', "La foto necesita 'archivo' o 'buscar'.");
    if (p.foto.archivo) {
      if (!p.foto.autor || !p.foto.licencia || !p.foto.url_origen)
        e('foto-licencia', 'Foto local: faltan autor, licencia o url_origen para el respaldo.');
      else if (!licenciaLibre(p.foto.licencia)) e('foto-licencia', `Licencia no libre: ${p.foto.licencia}`);
    }
  }
  return h;
}

export function validarHechos(hechos: Hechos, opts: {numerar: boolean}): Hallazgo[] {
  const h = hechos.piezas.flatMap((p, i) => validarPieza(p, i, opts));
  if (hechos.piezas.length !== 3) h.push({pieza: null, nivel: 'aviso', regla: 'tres-hechos', mensaje: `Se esperan 3 hechos y hay ${hechos.piezas.length}.`});
  return h;
}

export const hayErrores = (h: Hallazgo[]) => h.some((x) => x.nivel === 'error');
