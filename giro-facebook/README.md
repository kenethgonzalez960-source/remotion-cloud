# Giro Facebook diario

Automatiza las imágenes para la Página de Facebook de Giro Hacia La Izquierda.

- `generador.html`: generador de imágenes (estilo collage de recortes).
- `render.js`: crea los PNG y el texto de cada publicación. Uso: `node giro-facebook/render.js piezas.json salida/AAAA-MM-DD`
- `publicar.js`: sube los PNG a la Página con la Graph API. Necesita los secretos `FB_PAGE_ID` y `FB_PAGE_TOKEN`.
- `modo.txt`: `borrador` (solo genera y guarda en `salida/`) o `publicar` (genera y sube a Facebook).
- `estrategia.json`: reglas editoriales y pasos de la rutina diaria.
- `salida/AAAA-MM-DD/`: piezas del día (`pieza-N.png`, `pieza-N.txt`) y `respaldo.md` con enlaces y licencias.

Las imágenes no llevan número salvo que se pida expresamente.
