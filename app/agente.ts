import {spawn} from 'node:child_process';
import os from 'node:os';
import {Hechos} from '../cli/esquema';
import {hayErrores, validarHechos} from '../cli/reglas';
import {leerConfig, type Log} from '../cli/pipeline';

/** Programa de Claude Code. Se puede cambiar con GIRO_CLAUDE (por ejemplo, para pruebas). */
const CLAUDE = process.env.GIRO_CLAUDE ?? 'claude';
const MODELO = process.env.GIRO_MODEL; // vacío = el modelo que use su plan por defecto

const ESQUEMA = `Responde SOLO con un bloque \`\`\`json con esta forma exacta:
{
  "fecha": "AAAA-MM-DD",
  "piezas": [{
    "titulo": "TÍTULO EN MAYÚSCULAS CON UNA *PALABRA* CLAVE",
    "apoyo": ["párrafo 1: el hecho", "párrafo 2: por qué importa"],
    "recorte": {"titular": "titular textual copiado de la nota", "medio": "nombre del medio", "url": "url de esa nota"},
    "contexto": {"pasado": "antecedente verificable encontrado", "futuro": "qué sigue (audiencia, votación, decisión)"},
    "fuentes": [{"medio": "...", "url": "...", "fecha_consulta": "AAAA-MM-DD", "documento_oficial": false}],
    "es_denuncia": false,
    "foto": {"buscar": "Nombre Apellido de la persona principal"},
    "numero": "",
    "tono": "amarillo"
  }],
  "descartados": [{"tema": "...", "razon": "..."}]
}
La URL del recorte debe estar también en "fuentes". "numero" va siempre vacío. Omite "foto" si no hay persona clara.
Cada párrafo de "apoyo" debe tener frases de 15 a 25 palabras. Máximo 3 piezas.`;

async function instrucciones(): Promise<string> {
  const cfg = await leerConfig();
  return [
    cfg.prompt_rutina,
    '',
    'REGLAS EDITORIALES (obligatorias):',
    ...cfg.reglas_editoriales.map((r: string) => `- ${r}`),
    '',
    'IMPORTANTE: en esta aplicación tú NO generas imágenes, ni abres el generador, ni escribes el texto de la publicación ni el respaldo: eso lo hace la aplicación después. Tu trabajo son los pasos de buscar, escoger, contexto, redactar y fotos, y entregar solo el JSON.',
    'Usa únicamente tus herramientas de búsqueda y lectura web. No uses archivos ni comandos.',
    'No inventes nada: si no pudiste verificar un dato con las herramientas, no lo escribas. Prefiere menos piezas a una pieza dudosa.',
    ESQUEMA,
  ].join('\n');
}

const hoy = () => new Date().toLocaleDateString('en-CA', {timeZone: 'America/Bogota'});

function extraerJson(texto: string): unknown {
  const m = texto.match(/```json\s*([\s\S]*?)```/) ?? texto.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error('Claude no devolvió un JSON.');
  return JSON.parse(m[1]);
}

export class ErrorClaude extends Error {}

function traducir(salida: string, stderr: string): string {
  const t = `${salida}\n${stderr}`;
  if (/not logged in|please run \/login|invalid api key|authentication/i.test(t)) return 'Claude Code no tiene la sesión iniciada. Abra una terminal, escriba "claude" y entre con su cuenta (comando /login).';
  if (/usage limit|limit reached|rate limit|too many requests|weekly limit/i.test(t)) return 'Se alcanzó el límite de uso de su plan de Claude. Espere a que se renueve e intente de nuevo.';
  return (stderr || salida).trim().slice(0, 400) || 'Claude Code terminó sin respuesta.';
}

/** Verifica que Claude Code esté instalado. */
export function claudeInstalado(): Promise<{ok: boolean; version?: string}> {
  return new Promise((ok) => {
    const p = spawn(CLAUDE, ['--version'], {shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore']});
    let s = '';
    p.stdout.on('data', (d) => (s += d));
    p.on('error', () => ok({ok: false}));
    p.on('close', (c) => ok(c === 0 ? {ok: true, version: s.trim()} : {ok: false}));
  });
}

/** Un turno de Claude Code (modo no interactivo, con el plan del usuario). Devuelve texto y id de sesión para continuar. */
function turno(prompt: string, sesion: string | null, log: Log): Promise<{texto: string; sesion: string | null}> {
  return new Promise((ok, fail) => {
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'WebSearch,WebFetch', '--max-turns', '60'];
    if (MODELO) args.push('--model', MODELO);
    if (sesion) args.push('--resume', sesion);
    const p = spawn(CLAUDE, args, {cwd: os.tmpdir(), shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe']});
    let resto = '', stderr = '', texto = '', id: string | null = sesion, termino = false, error = false;
    const linea = (l: string) => {
      let e: any;
      try { e = JSON.parse(l); } catch { return; }
      if (e.session_id) id = e.session_id;
      if (e.type === 'assistant') for (const b of e.message?.content ?? []) {
        if (b.type === 'tool_use' && b.name === 'WebSearch') log(`Buscando: ${b.input?.query ?? ''}`);
        if (b.type === 'tool_use' && b.name === 'WebFetch') log(`Leyendo: ${b.input?.url ?? ''}`);
      }
      if (e.type === 'result') { termino = true; error = !!e.is_error; texto = typeof e.result === 'string' ? e.result : ''; }
    };
    p.stdout.on('data', (d) => { resto += d; const ls = resto.split('\n'); resto = ls.pop() ?? ''; ls.forEach(linea); });
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', () => fail(new ErrorClaude('No se encontró Claude Code. Instálelo desde claude.com/code y entre con su cuenta.')));
    p.on('close', () => {
      if (resto) linea(resto);
      if (!termino || error) return fail(new ErrorClaude(traducir(texto, stderr)));
      ok({texto, sesion: id});
    });
    p.stdin.end(prompt);
  });
}

/** Investiga (según enlaces o por cuenta propia), valida y corrige hasta 2 veces. */
export async function investigar(opts: {enlaces?: string[]; numerar: boolean; log: Log}): Promise<{hechos: Hechos; descartados: {tema: string; razon: string}[]}> {
  const {log} = opts;
  const base = await instrucciones();
  const tarea = opts.enlaces?.length
    ? `Hoy es ${hoy()}. Convierte estas noticias en piezas. Lee cada enlace con WebFetch y copia el titular textual. Para cada hecho busca con WebSearch una SEGUNDA fuente independiente (o un documento oficial); si no la hay, descártalo y explica por qué en "descartados". Luego busca el antecedente y lo que sigue.\n\nEnlaces:\n${opts.enlaces.map((u) => `- ${u}`).join('\n')}`
    : `Hoy es ${hoy()}. Haz la rutina diaria completa: busca las noticias de las últimas 24 horas, elige los 3 hechos con más potencial que cumplan la regla de dos fuentes, y entrega las piezas.`;

  let prompt = `${base}\n\n---\nTAREA\n${tarea}`;
  let sesion: string | null = null;
  for (let ronda = 0; ronda < 3; ronda++) {
    log(ronda === 0 ? 'Investigando… (puede tardar varios minutos)' : 'Corrigiendo según las reglas editoriales…');
    const r = await turno(prompt, sesion, log);
    sesion = r.sesion;
    let problema: string;
    try {
      const crudo = extraerJson(r.texto) as any;
      const hechos = Hechos.parse({fecha: hoy(), ...crudo});
      const hallazgos = validarHechos(hechos, {numerar: opts.numerar});
      if (!hayErrores(hallazgos)) return {hechos, descartados: Array.isArray(crudo.descartados) ? crudo.descartados : []};
      problema = hallazgos.filter((h) => h.nivel === 'error').map((h) => `pieza ${(h.pieza ?? 0) + 1}: ${h.mensaje}`).join('\n');
    } catch (e) {
      problema = `El JSON no es válido: ${(e as Error).message}`;
    }
    prompt = `Corrige estos problemas y devuelve el JSON completo otra vez (puedes quitar piezas que no se puedan sostener):\n${problema}`;
  }
  throw new Error('No se logró una versión que cumpla las reglas editoriales. Intente con otros enlaces.');
}
