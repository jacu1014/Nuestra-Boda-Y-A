# Sistema de invitación y administración de boda

Este proyecto convierte la invitación de boda en un sitio dinámico y configurable, con una interfaz pública para invitados y un panel privado para administrarlo sin editar código fuente.

## Stack

- Node.js + Express
- HTML, CSS y JavaScript vanilla
- Excel como almacenamiento operativo de invitados, mensajes y canciones
- JSON como fuente de configuración del sitio
- QR generado on-the-fly para álbum y regalos

## Requisitos locales

- Node.js 18 o superior
- npm
- Un archivo `.env` con credenciales reales del panel administrativo

## Configuración rápida

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto y usa los valores reales del evento:
   ```env
   PORT=3000
   ADMIN_USERNAME=tu_usuario_admin
   ADMIN_PASSWORD=tu_password_seguro
   SESSION_SECRET=una_clave_larga_y_unica
   ```

   También puedes basarte en el archivo `.env.example` incluido en el repositorio como plantilla segura.

3. Inicia la aplicación:
   ```bash
   npm start
   ```

4. Abre en el navegador:
   - Invitación pública: `http://localhost:3000/invitacion.html`
   - Panel admin: `http://localhost:3000/admin-login.html`

## Preparado para GitHub

Este proyecto ya está estructurado para subirlo a un repositorio sin exponer secretos ni archivos del entorno local.

Checklist recomendada:

```bash
# 1. Verifica que no haya archivos sensibles en el estado de Git
ls -la

# 2. Crea tu repositorio en GitHub
# 3. Haz el primer push desde la carpeta raíz del proyecto
# 4. Configura las variables reales de entorno en GitHub Secrets o en el panel del hosting
```

Archivos que NO deben subirse:

- `.env`
- `node_modules/`
- `uploads/` si tu hosting no conserva archivos permanentes
- logs o temporales del entorno local

## Notas importantes para producción

La aplicación usa almacenamiento local del servidor para:

- `Asistencia/Asistencia.xlsx`
- `wedding-settings.json`
- `uploads/`

Estos archivos deben guardarse en un disco persistente. No son seguros ni confiables en entornos de filesystem efímero, por ejemplo:

- Vercel serverless
- Render free sin volumen persistente
- plataformas con almacenamiento temporal por reinicio

Si despliegas en producción, asegúrate de que el hosting conserve este contenido entre reinicios y actualizaciones.

## Seguridad y despliegue

- Nunca subas el archivo `.env` ni `node_modules/` a GitHub.
- Usa credenciales fuertes para `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `SESSION_SECRET`.
- Rotar las credenciales si alguna vez se expusieron antes del primer push.
- Mantén los archivos y carpetas persistentes fuera del artefacto de despliegue si tu hosting no los conserva.

## Funcionalidades principales

- Personalización del sitio desde el panel admin
- Gestión de invitados y CRM operativo
- Moderación de mensajes públicos
- Sugerencias de canciones
- Galería con fotos activas/inactivas y orden configurable
- Generación automática de QR para álbum y regalos
- Persistencia centralizada en Excel + JSON
