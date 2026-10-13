import {z} from 'zod';

export const Fuente = z.object({
  medio: z.string().min(2),
  url: z.string().url(),
  fecha_consulta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documento_oficial: z.boolean().default(false),
});

export const Foto = z.object({
  /** Ruta local a una foto ya descargada, o null para que la herramienta la busque en Commons. */
  archivo: z.string().nullable().default(null),
  /** Nombre de la persona a buscar en Wikimedia Commons. */
  buscar: z.string().optional(),
  autor: z.string().optional(),
  licencia: z.string().optional(),
  url_origen: z.string().url().optional(),
});

export const Pieza = z.object({
  titulo: z.string(),
  apoyo: z.array(z.string()).length(2),
  recorte: z.object({titular: z.string().min(5), medio: z.string().min(2), url: z.string().url()}),
  contexto: z.object({pasado: z.string().min(5), futuro: z.string().min(5)}),
  fuentes: z.array(Fuente).min(1),
  es_denuncia: z.boolean().default(false),
  foto: Foto.optional(),
  numero: z.string().default(''),
  tono: z.enum(['amarillo', 'rojo']).default('amarillo'),
});

export const Hechos = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Los archivos de ejemplo nunca se publican. */
  ejemplo: z.boolean().default(false),
  piezas: z.array(Pieza).min(1).max(3),
});

export type Hechos = z.infer<typeof Hechos>;
export type Pieza = z.infer<typeof Pieza>;
