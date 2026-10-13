# Giro Fábrica

## Aplicación (la forma fácil)

1. Instale **Node.js** (nodejs.org) y **Claude Code** (claude.com/code), una sola vez.
2. Abra una terminal, escriba `claude` y entre con su cuenta de Claude (`/login`). Cierre.
3. Haga doble clic en **Iniciar-Giro.bat** (Windows) o **Iniciar-Giro.command** (Mac). La primera vez instala lo necesario y abre la página en su navegador.
4. Elija: **pegar enlaces** de noticias, o **"Hacer la rutina de hoy"** para que Claude busque, investigue y arme las 3 piezas.
5. Los resultados quedan en `Descargas/Giro/AAAA-MM-DD_HHMM/`: `pieza-N.png` y `pieza-N.txt` (mismo formato que usa `giro-facebook/publicar.js`), `texto.txt`, `respaldo.md` y `hechos.json`.

Las imágenes se dibujan con el generador de la fábrica (`giro-facebook/generador.html`, plantilla "Collage de recortes" 1080x1350) y las reglas salen de `giro-facebook/estrategia.json`. El modo (`borrador` o `publicar`) se lee de `giro-facebook/modo.txt`.

La investigación la hace Claude Code (`claude -p`) con sus herramientas de búsqueda y lectura web, usando **su plan de Claude**: no hay clave de API ni cobro aparte, pero cada corrida cuenta contra los límites de uso de su plan. El modelo se puede cambiar con la variable `GIRO_MODEL`. El resultado pasa por el validador editorial; si no cumple las reglas, Claude lo corrige hasta dos veces antes de rendirse.

Las imágenes se dibujan con el generador de la fábrica (`giro-facebook/generador.html`, plantilla "Collage de recortes" 1080x1350) y las reglas salen de `giro-facebook/estrategia.json`. El modo (`borrador` o `publicar`) se lee de `giro-facebook/modo.txt`.

La investigación usa la API de Claude (modelo `claude-opus-5-5`, cambiable con la variable `GIRO_MODEL`) con búsqueda y lectura web, y cada corrida tiene costo según su plan de API. El resultado pasa por el validador editorial; si no cumple las reglas, Claude lo corrige hasta dos veces antes de rendirse.

Herramienta de producción diaria para **Giro Hacia La Izquierda**. Implementa `config/estrategia-giro-nube.json`.

## Reparto de trabajo

| Quién | Qué |
|---|---|
| Rutina en la nube (Claude, `prompt_rutina`) | Pasos 1 a 5: buscar noticias, elegir 3 hechos, contexto, redacción y fotos. Entrega un `hechos.json`. |
| Esta herramienta | Pasos 6 a 10: valida reglas editoriales, busca foto libre, dibuja los PNG 1080x1350 con `generador.html`, escribe `texto.txt` y `respaldo.md`, y publica solo si el modo lo permite. |

## Uso

```bash
npm install
npm run giro validar  ejemplos/hechos-ejemplo.json
npm run giro generar  hechos.json            # salida/AAAA-MM-DD/pieza-N.png, texto.txt, respaldo.md
npm run giro publicar hechos.json --dry-run  # solo si `giro-facebook/modo.txt` = `publicar`
npm test
```

`--numerar` permite numerar piezas ("1.", "2.", "3."); sin él, cualquier número en la pieza es un error.

## Reglas que el validador hace cumplir

Dos medios distintos o documento oficial; el recorte debe apuntar a una fuente listada; denuncias redactadas como denuncia;
título en mayúsculas con una palabra clave entre `*asteriscos*`; palabra prohibida "desnudamos"; sin línea "Fuente:"; sin número no pedido;
fotos solo con licencia libre (CC0, CC BY, CC BY-SA, dominio público) y con autor y enlace. Avisos: frases fuera de 15 a 25 palabras.
La herramienta **no puede verificar que un titular sea textual**: eso queda en `respaldo.md` para revisión del abogado.

## Publicación

Por defecto el modo es `borrador`. Para publicar directo: poner ``giro-facebook/modo.txt` = `publicar``, definir los secretos
`FB_PAGE_ID` y `FB_PAGE_TOKEN` en el entorno y permitir `graph.facebook.com` en la red. Los `hechos` marcados `"ejemplo": true` nunca se publican.

## Entorno en la nube

El render usa Chromium de Playwright (`CHROMIUM_PATH` o `npx playwright install chromium`). También hay que permitir `commons.wikimedia.org` en la red para buscar fotos.
