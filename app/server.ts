import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {investigar, claudeInstalado} from './agente';
import {generarEnCarpeta} from '../cli/pipeline';

const PUERTO = Number(process.env.GIRO_PUERTO ?? 4300);
const SALIDA = process.env.GIRO_SALIDA ?? path.join(os.homedir(), 'Downloads', 'Giro');
const TIPOS: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.json': 'application/json'};

type Trabajo = {estado: 'trabajando' | 'listo' | 'error'; log: string[]; carpeta?: string; archivos?: string[]; texto?: string; descartados?: {tema: string; razon: string}[]; error?: string};
let trabajo: Trabajo | null = null;

const marca = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };

async function correr(enlaces: string[] | undefined, numerar: boolean) {
  const t: Trabajo = (trabajo = {estado: 'trabajando', log: []});
  const log = (m: string) => t.log.push(m);
  try {
    const {hechos, descartados} = await investigar({enlaces, numerar, log});
    t.descartados = descartados;
    const carpeta = path.join(SALIDA, marca());
    const r = await generarEnCarpeta(hechos, carpeta, {numerar, log});
    t.carpeta = path.basename(carpeta);
    t.archivos = r.archivos;
    t.texto = await readFile(path.join(carpeta, 'texto.txt'), 'utf8');
    log(`Listo. Carpeta: ${carpeta}`);
    t.estado = 'listo';
  } catch (e) {
    t.error = e instanceof Error ? e.message : String(e);
    t.estado = 'error';
  }
}

function abrir(destino: string) {
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', destino]] : process.platform === 'darwin' ? ['open', [destino]] : ['xdg-open', [destino]];
  spawn(cmd as string, args as string[], {detached: true, stdio: 'ignore'}).on('error', () => {}).unref();
}

const cuerpo = (req: http.IncomingMessage) => new Promise<any>((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ok({}); } }); });
const json = (res: http.ServerResponse, d: unknown, code = 200) => { res.writeHead(code, {'Content-Type': 'application/json'}); res.end(JSON.stringify(d)); };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // Solo la propia página puede llamar a la API (evita que otras webs lancen trabajos en su nombre).
    if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://localhost:${PUERTO}`) return json(res, {error: 'Origen no permitido'}, 403);

    if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, {'Content-Type': TIPOS['.html']}); return res.end(await readFile(path.join(__dirname, 'index.html'))); }
    if (req.method === 'GET' && url.pathname === '/api/estado') return json(res, {claude: await claudeInstalado(), salida: SALIDA, trabajo});
    if (req.method === 'POST' && (url.pathname === '/api/enlaces' || url.pathname === '/api/automatico')) {
      if (trabajo?.estado === 'trabajando') return json(res, {error: 'Ya hay un trabajo en marcha.'}, 409);
      const b = await cuerpo(req);
      const enlaces = url.pathname === '/api/enlaces' ? String(b.enlaces ?? '').split(/\s+/).filter((u) => /^https?:\/\//.test(u)) : undefined;
      if (enlaces && !enlaces.length) return json(res, {error: 'Pegue al menos un enlace que empiece por http.'}, 400);
      void correr(enlaces, !!b.numerar);
      return json(res, {ok: true});
    }
    if (req.method === 'POST' && url.pathname === '/api/abrir') { await mkdir(SALIDA, {recursive: true}); abrir(trabajo?.carpeta ? path.join(SALIDA, trabajo.carpeta) : SALIDA); return json(res, {ok: true}); }
    if (req.method === 'GET' && url.pathname.startsWith('/archivo/')) {
      const f = path.resolve(SALIDA, decodeURIComponent(url.pathname.slice(9)));
      if (!f.startsWith(path.resolve(SALIDA) + path.sep)) { res.writeHead(403); return res.end(); }
      res.writeHead(200, {'Content-Type': TIPOS[path.extname(f)] ?? 'application/octet-stream'}); return res.end(await readFile(f));
    }
    res.writeHead(404); res.end();
  } catch (e) { json(res, {error: e instanceof Error ? e.message : String(e)}, 500); }
}).listen(PUERTO, '127.0.0.1', () => {
  console.log(`Giro Fábrica en http://localhost:${PUERTO}  (resultados en ${SALIDA})`);
  if (!process.env.GIRO_NO_ABRIR) abrir(`http://localhost:${PUERTO}`);
});
