# PROMPT — Cerrar pendientes: mensajes/canciones/QR/galería + preparar deploy

Pega este documento como instrucción al agente que ya está trabajando en el repo (Node/Express + `Admin.html/js`, `invitacion.html/js`, `server.js`). El backend de estos módulos ya existe y funciona; lo que falta es conectar el frontend y dejar el repo listo para subir a GitHub/producción.

## 1. Conectar el formulario de mensajes (`invitacion.html` → `invitacion.js`)
El formulario `#mensajes` ya existe en el HTML pero no tiene JS asociado.
1. En `invitacion.js`, capturar el `submit` del formulario de mensajes, `event.preventDefault()`, y hacer `POST` a `/api/mensajes` con `{ nombre, mensaje }` (usar el mismo patrón `apiUrl(...)` que ya usan `/api/confirmar` y `/api/invitados`).
2. Tras un envío exitoso: limpiar el formulario y refrescar el listado sin recargar la página.
3. Renderizar el listado público: al cargar la página, `GET /api/mensajes` y pintar cada mensaje (nombre + texto + fecha relativa) en un contenedor dentro de `#mensajes` (crear el contenedor si no existe en el HTML). Manejar el caso de lista vacía con un texto tipo "Sé el primero en dejar un mensaje".
4. Mostrar error inline (no `alert()`) si el POST falla o si `mensaje` supera el `maxlength=500` ya definido en el textarea.

## 2. Conectar el formulario de canciones (`invitacion.html` → `invitacion.js`)
Mismo patrón que el punto 1: el input `cancion` ya existe en el HTML sin JS.
1. Capturar `submit`, `POST` a `/api/canciones` con `{ cancion, artista, sugeridoPor }`.
2. Confirmación visual simple tras enviar (ej. "¡Gracias por tu sugerencia!"); no es obligatorio mostrar listado público de canciones (la playlist la arma quien organiza desde Excel/Admin), pero si el diseño ya tiene un espacio para listarlas, usar `GET /api/canciones`.

## 3. Mostrar el QR generado (`invitacion.js`)
El backend ya genera `qrAlbumImage`/`qrGiftsImage` con la librería `qrcode` al guardar el link en Admin, pero `invitacion.js` nunca los usa — el placeholder `<div id="album-qr-frame">` se queda estático siempre.
1. En la función que aplica los settings recibidos de `/api/public` (la misma que llama `applyTheme`), leer `settings.qrAlbumImage`.
2. Si existe, reemplazar el contenido de `#album-qr-frame` por `<img src="{qrAlbumImage}" alt="Código QR del álbum">`; si está vacío, dejar el placeholder actual tal cual (fallback).
3. Repetir el mismo tratamiento para `qrGiftsImage` si existe una sección de regalos con su propio frame.

## 4. Panel de moderación de mensajes en Admin (`Admin.html`/`Admin.js`)
El endpoint `GET /api/mensajes-admin` y `PUT /api/mensajes/:id` ya existen en `server.js` pero no hay UI que los use.
1. Nueva tarjeta/sección en `Admin.html`: tabla o lista con cada mensaje (nombre, texto, fecha) + un toggle/checkbox "Visible".
2. Al cargar el panel, `GET /api/mensajes-admin` (trae todos, visibles y ocultos) y pintar la lista.
3. Al cambiar el toggle, `PUT /api/mensajes/:id` con `{ visible: true|false }` inmediatamente (no esperar al submit general del formulario grande).

## 5. Gestión real de la galería en Admin (`Admin.html`/`Admin.js`)
El endpoint `GET /api/gallery/available` ya existe (detecta fotos sueltas en `Fotos/` no registradas) pero nada en el frontend lo consume; el formulario de galería sigue siendo solo "agregar una foto nueva".
1. Reemplazar el formulario simple actual por una vista de galería: grid con las fotos ya registradas en `gallery` (miniatura + campo `caption` editable inline + checkbox `enabled` + botón eliminar).
2. Sección aparte "Fotos disponibles sin usar": `GET /api/gallery/available` al cargar el panel, pintar miniaturas con botón "Añadir al carrusel" que agrega ese `src` al array `gallery` local (sin re-subir el archivo).
3. Reordenar: drag & drop simple (o botones subir/bajar si drag & drop es mucho esfuerzo) que actualiza el orden del array `gallery` antes de guardar.
4. El formulario de subida actual (`galleryImage`/`galleryUrl`/`galleryCaption`) se mantiene para fotos que no estén ya en `Fotos/`.
5. Al hacer submit del formulario grande, `gallery` debe viajar en el orden final que se ve en pantalla.

## 6. Limpieza final de `localStorage`
`invitacion.js` ya quedó limpio; faltan dos archivos:
1. `script.js` (usado por `index.html`): quitar el fallback a `localStorage` para `brideName`/`groomName`/`weddingSettings` — debe leer únicamente de `/api/public` o `/api/settings`, igual que ya hace `invitacion.js`.
2. `Admin.js`: quitar el fallback "se quedó en localStorage" al fallar el guardado contra el servidor, y las lecturas de `localStorage.getItem('weddingSettings'...)` — si el servidor no responde, mostrar un error claro en pantalla en vez de guardar en local silenciosamente (evita que el admin crea que guardó cuando en realidad no).

## 7. Preparar el repo para subir a GitHub / deploy
1. Crear `.gitignore` en la raíz con al menos: `node_modules/`, `.env`, `uploads/`.
2. En `server.js`, quitar los valores por defecto hardcodeados de `ADMIN_USERNAME`/`ADMIN_PASSWORD` (actualmente caen en `'adminnovios'`/`'14242508'` si falta `.env`) — si no hay `.env` configurado, el servidor debe fallar al arrancar con un mensaje claro, no arrancar con credenciales débiles conocidas.
3. Documentar en `README.md`: cómo correr localmente (`npm install`, `.env` de ejemplo sin valores reales, `npm start`), y una nota explícita de que `Asistencia.xlsx`, `wedding-settings.json` y `uploads/` necesitan un disco persistente en el hosting elegido (no sirven en plataformas con filesystem efímero tipo Vercel serverless o Render free sin volumen).
4. Confirmar que las credenciales actuales del `.env` real no queden en el historial de git antes del primer push (si ya se hizo commit con ellas, hay que rotarlas).

## Criterios de aceptación
- Enviar un mensaje o una canción desde `invitacion.html` los persiste en el Excel correspondiente y, para mensajes, aparecen en la página sin recargar.
- El QR del álbum se ve como imagen real en la página pública tras configurarlo en Admin, sin pasos manuales adicionales.
- Desde Admin se pueden ocultar/mostrar mensajes y reordenar/activar/desactivar fotos del carrusel, incluyendo las que ya estaban sueltas en `Fotos/`.
- `script.js` y `Admin.js` ya no leen ni escriben contenido en `localStorage`.
- El repo no incluye `node_modules/` ni `.env` en git; el servidor no arranca con credenciales admin por defecto conocidas.
