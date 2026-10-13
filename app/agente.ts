import Anthropic from '@anthropic-ai/sdk';
import {Hechos} from '../cli/esquema';
import {hayErrores, validarHechos} from '../cli/reglas';
import {leerConfig, type Log} from '../cli/pipeline';

const MODELO = process.env.GIRO_MODEL ?? 'claude-opus-5-5';

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

async function sistema(): Promise<string> {
  const cfg = await leerConfig();
  return [
    cfg.prompt_rutina,
    '',
    'REGLAS EDITORIALES (obligatorias):',
    ...cfg.reglas_editoriales.map((r: string) => `- ${r}`),
    '',
    'No inventes nada: si no pudiste verificar un dato con las herramientas, no lo escribas. Prefiere menos piezas a una pieza dudosa.',
    ESQUEMA,
  ].join('\n');
}

const hoy = () => new Date().toLocaleDateString('en-CA', {timeZone: 'America/Bogota'});

function extraerJson(texto: string): unknown {
  const m = texto.match(/```json\s*([\s\S]*?)```/) ?? texto.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error('El asistente no devolvió un JSON.');
  return JSON.parse(m[1]);
}

// Herramientas del lado del servidor: Anthropic ejecuta la búsqueda y la lectura de páginas.
const HERRAMIENTAS = [
  {type: 'web_search_20260209', name: 'web_search', max_uses: 25},
  {type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 15},
] as unknown as Anthropic.Messages.ToolUnion[];

async function turno(client: Anthropic, system: string, messages: Anthropic.MessageParam[], log: Log): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const stream = client.messages.stream({
      model: MODELO, max_tokens: 32000, system, messages, tools: HERRAMIENTAS,
      thinking: {type: 'adaptive'}, output_config: {effort: 'high'},
    });
    stream.on('contentBlock', (b: any) => {
      if (b.type === 'server_tool_use') log(b.name === 'web_search' ? `Buscando: ${b.input?.query ?? ''}` : `Leyendo: ${b.input?.url ?? ''}`);
    });
    const r = await stream.finalMessage();
    if (r.stop_reason === 'refusal') throw new Error('El modelo se negó a responder esta solicitud.');
    if (r.stop_reason === 'pause_turn') { messages.push({role: 'assistant', content: r.content}); continue; }
    messages.push({role: 'assistant', content: r.content});
    return r.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n');
  }
  throw new Error('La investigación tardó demasiado; intente de nuevo.');
}

/** Investiga (según enlaces o por cuenta propia), valida y corrige hasta 2 veces. */
export async function investigar(opts: {apiKey: string; enlaces?: string[]; numerar: boolean; log: Log}): Promise<{hechos: Hechos; descartados: {tema: string; razon: string}[]}> {
  const {log} = opts;
  const client = new Anthropic({apiKey: opts.apiKey});
  const system = await sistema();
  const peticion = opts.enlaces?.length
    ? `Hoy es ${hoy()}. Convierte estas noticias en piezas. Lee cada enlace con web_fetch y copia el titular textual. Para cada hecho busca con web_search una SEGUNDA fuente independiente (o un documento oficial); si no la hay, descártalo y explica por qué en "descartados". Luego busca el antecedente y lo que sigue.\n\nEnlaces:\n${opts.enlaces.map((u) => `- ${u}`).join('\n')}`
    : `Hoy es ${hoy()}. Haz la rutina diaria completa: busca las noticias de las últimas 24 horas, elige los 3 hechos con más potencial que cumplan la regla de dos fuentes, y entrega las piezas.`;
  const messages: Anthropic.MessageParam[] = [{role: 'user', content: peticion}];

  for (let ronda = 0; ronda < 3; ronda++) {
    log(ronda === 0 ? 'Investigando… (puede tardar varios minutos)' : 'Corrigiendo según las reglas editoriales…');
    const texto = await turno(client, system, messages, log);
    let problema: string | null = null;
    try {
      const crudo = extraerJson(texto) as any;
      const hechos = Hechos.parse({fecha: hoy(), ...crudo});
      const hallazgos = validarHechos(hechos, {numerar: opts.numerar});
      if (!hayErrores(hallazgos)) return {hechos, descartados: Array.isArray(crudo.descartados) ? crudo.descartados : []};
      problema = hallazgos.filter((h) => h.nivel === 'error').map((h) => `pieza ${(h.pieza ?? 0) + 1}: ${h.mensaje}`).join('\n');
    } catch (e) {
      problema = `El JSON no es válido: ${(e as Error).message}`;
    }
    messages.push({role: 'user', content: `Corrige estos problemas y devuelve el JSON completo otra vez (puedes quitar piezas que no se puedan sostener):\n${problema}`});
  }
  throw new Error('No se logró una versión que cumpla las reglas editoriales. Intente con otros enlaces.');
}
