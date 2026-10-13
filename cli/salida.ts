import type {Hechos, Pieza} from './esquema';

export type FotoResuelta = {dataUri: string; autor: string; licencia: string; url_origen: string} | null;

const sinAcentos = (t: string) => t.replace(/\*/g, '');

/** Mismo texto que genera giro-facebook/render.js, para que publicar.js lo siga leyendo. */
export function textoPublicacion(p: Pieza, hashtags: string): string {
  return [
    sinAcentos(p.titulo), '', sinAcentos(p.apoyo.join(' ')), '',
    'Cuéntenos en los comentarios qué opina.', 'Dele like y comparta para que más gente lo sepa.',
    'Suscríbase a Giro Hacia La Izquierda en YouTube.', '', hashtags,
  ].join('\n');
}

export function textoDelDia(h: Hechos, hashtags: string): string {
  return h.piezas.map((p, i) => `=== Pieza ${i + 1} ===\n${textoPublicacion(p, hashtags)}`).join('\n\n') + '\n';
}

export function respaldo(h: Hechos, fotos: FotoResuelta[]): string {
  const out: string[] = [`# Respaldo ${h.fecha}`, '', 'Para revisión del abogado antes de publicar.', ''];
  h.piezas.forEach((p, i) => {
    out.push(`## Pieza ${i + 1}: ${p.titulo.replace(/\*/g, '')}`, '');
    out.push(`- Tipo: ${p.es_denuncia ? 'DENUNCIA (no hecho probado)' : 'Hecho con doble fuente'}`);
    out.push(`- Titular del recorte (textual): "${p.recorte.titular}" — ${p.recorte.medio} — ${p.recorte.url}`);
    out.push('', '**Fuentes**');
    p.fuentes.forEach((f) => out.push(`- ${f.medio}${f.documento_oficial ? ' (documento oficial)' : ''}: ${f.url} (consultado ${f.fecha_consulta})`));
    out.push('', `**Antecedente:** ${p.contexto.pasado}`, `**Qué sigue:** ${p.contexto.futuro}`, '');
    const f = fotos[i];
    out.push(f ? `**Foto:** ${f.autor}, licencia ${f.licencia}, ${f.url_origen}` : '**Foto:** sin foto (formato sin persona)', '');
  });
  return out.join('\n');
}
