# ORBIS · Atlas 3D

Visor web de animales, criaturas, objetos y paisajes en 3D con información detallada de cada parte.

## Ejecutar
Necesita un servidor local (módulos ES) y conexión a internet (three.js se carga por CDN):

    python -m http.server 8765      # o: npx serve .

Abrir http://localhost:8765 (también `#medusa`, `#monarca`, `#dragon`, `#reloj`, `#isla`).

## Añadir un modelo
Crear `js/models/<nombre>.js` exportando `{ id, category, icon, accent, name, latin, summary, stats, curiosities, env, camera, build }`
y registrarlo en `js/models/index.js`. `build()` devuelve `{ group, parts, update(t, dt) }`; cada parte es `{ obj, name, desc, facts, fun, explode }`.
