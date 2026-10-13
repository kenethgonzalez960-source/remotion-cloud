# Giro Fábrica

Herramienta de producción diaria para **Giro Hacia La Izquierda**. Implementa `config/estrategia-giro-nube.json`.

## Reparto de trabajo

| Quién | Qué |
|---|---|
| Rutina en la nube (Claude, `prompt_rutina`) | Pasos 1 a 5: buscar noticias, elegir 3 hechos, contexto, redacción y fotos. Entrega un `hechos.json`. |
| Esta herramienta | Pasos 6 a 10: valida reglas editoriales, busca foto libre, renderiza PNG 1080x1350, escribe `texto.txt` y `respaldo.md`, y publica solo si el modo lo permite. |

## Uso

```bash
npm install
npm run giro validar  ejemplos/hechos-ejemplo.json
npm run giro generar  hechos.json            # salida/AAAA-MM-DD/pieza-N.png, texto.txt, respaldo.md
npm run giro publicar hechos.json --dry-run  # solo si modo_publicacion.actual = "publicar"
npm test
```

`--numerar` permite numerar piezas ("1.", "2.", "3."); sin él, cualquier número en la pieza es un error.

## Reglas que el validador hace cumplir

Dos medios distintos o documento oficial; el recorte debe apuntar a una fuente listada; denuncias redactadas como denuncia;
título en mayúsculas con una palabra clave entre `*asteriscos*`; palabra prohibida "desnudamos"; sin línea "Fuente:"; sin número no pedido;
fotos solo con licencia libre (CC0, CC BY, CC BY-SA, dominio público) y con autor y enlace. Avisos: frases fuera de 15 a 25 palabras.
La herramienta **no puede verificar que un titular sea textual**: eso queda en `respaldo.md` para revisión del abogado.

## Publicación

Por defecto el modo es `borrador`. Para publicar directo: poner `modo_publicacion.actual = "publicar"`, definir los secretos
`FB_PAGE_ID` y `FB_PAGE_TOKEN` en el entorno y permitir `graph.facebook.com` en la red. Los `hechos` marcados `"ejemplo": true` nunca se publican.

## Entorno en la nube

Remotion usa el `headless_shell` de Playwright (`/opt/pw-browsers`). También hay que permitir `commons.wikimedia.org` en la red para buscar fotos.
