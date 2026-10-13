import {readFile} from 'node:fs/promises';
import {licenciaLibre} from './reglas';
import type {Pieza} from './esquema';
import type {FotoResuelta} from './salida';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'GiroFabrica/1.0 (canal Giro Hacia La Izquierda)';
const strip = (s: string) => s.replace(/<[^>]*>/g, '').trim();

const mime = (f: string) => (/\.png$/i.test(f) ? 'image/png' : 'image/jpeg');

export async function buscarFotoLibre(nombre: string): Promise<FotoResuelta> {
  const q = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${nombre} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '10',
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1080',
  });
  const r = await fetch(`${API}?${q}`, {headers: {'User-Agent': UA}});
  if (!r.ok) throw new Error(`Wikimedia respondió ${r.status}`);
  const j: any = await r.json();
  const paginas = Object.values<any>(j.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  for (const pg of paginas) {
    const ii = pg.imageinfo?.[0];
    const meta = ii?.extmetadata ?? {};
    const licencia = strip(meta.LicenseShortName?.value ?? '');
    if (!ii?.thumburl || !licenciaLibre(licencia)) continue;
    const titulo = `${pg.title ?? ''} ${strip(meta.ImageDescription?.value ?? '')}`.toLowerCase();
    if (!nombre.toLowerCase().split(/\s+/).every((t) => titulo.includes(t))) continue;
    const img = await fetch(ii.thumburl, {headers: {'User-Agent': UA}});
    if (!img.ok) continue;
    const buf = Buffer.from(await img.arrayBuffer());
    return {
      dataUri: `data:${img.headers.get('content-type') ?? 'image/jpeg'};base64,${buf.toString('base64')}`,
      autor: strip(meta.Artist?.value ?? 'Autor no indicado'), licencia, url_origen: ii.descriptionurl,
    };
  }
  return null; // sin foto libre: formato sin persona
}

export async function resolverFoto(p: Pieza): Promise<FotoResuelta> {
  if (!p.foto) return null;
  if (p.foto.archivo) {
    const buf = await readFile(p.foto.archivo);
    return {dataUri: `data:${mime(p.foto.archivo)};base64,${buf.toString('base64')}`, autor: p.foto.autor!, licencia: p.foto.licencia!, url_origen: p.foto.url_origen!};
  }
  return buscarFotoLibre(p.foto.buscar!);
}
