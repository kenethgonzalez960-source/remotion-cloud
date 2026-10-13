import {readFile} from 'node:fs/promises';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function credenciales(): {pageId: string; token: string} {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  if (!pageId || !token) throw new Error('Faltan FB_PAGE_ID y FB_PAGE_TOKEN en el entorno (guárdelos como secretos; nunca en el chat ni en el repo).');
  return {pageId, token};
}

export async function publicarFoto(png: string, mensaje: string): Promise<string> {
  const {pageId, token} = credenciales();
  const form = new FormData();
  form.set('message', mensaje);
  form.set('access_token', token);
  form.set('source', new Blob([await readFile(png)], {type: 'image/png'}), 'pieza.png');
  const r = await fetch(`${GRAPH}/${pageId}/photos`, {method: 'POST', body: form});
  const j: any = await r.json();
  if (!r.ok) throw new Error(`Graph API ${r.status}: ${j.error?.message ?? 'error desconocido'}`);
  return j.post_id ?? j.id;
}
