# Sistema de invitación y administración de boda

Este proyecto convierte la invitación de boda en un sitio dinámico y configurable, con una interfaz pública para invitados y un panel privado para administrarlo sin editar código fuente.

## Stack

- Node.js + Express
- HTML, CSS y JavaScript vanilla
- Excel como almacenamiento operativo de invitados, mensajes y canciones
- JSON como fuente de configuración del sitio
- Supabase para una base de datos y almacenamiento más robusto en producción
- QR generado on-the-fly para álbum y regalos

## Requisitos locales

- Node.js 18 o superior
- npm
- Un archivo `.env` con credenciales reales del panel administrativo
- Cuenta de Supabase para crear la base de datos y el bucket de archivos

## Configuración rápida

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto usando la plantilla:
   ```bash
   cp .env.example .env
   ```

3. Ajusta el contenido real:
   ```env
   PORT=3000
   ADMIN_USERNAME=tu_usuario_admin
   ADMIN_PASSWORD=tu_password_seguro
   SESSION_SECRET=una_clave_larga_y_unica

   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   SUPABASE_BUCKET=uploads
   ```

4. Inicia la aplicación:
   ```bash
   npm start
   ```

5. Abre en el navegador:
   - Invitación pública: `http://localhost:3000/invitacion.html`
   - Panel admin: `http://localhost:3000/admin-login.html`

## Preparado para GitHub

Este proyecto ya está preparado para subirse a un repositorio de GitHub sin incluir secretos ni dependencias locales.

Checklist recomendada:

```bash
# 1. Verifica que el proyecto no tenga archivos sensibles
ls -la

# 2. Inicializa tu repositorio si aún no existe
git init

# 3. Añade los archivos relevantes
git add .

# 4. Haz el primer commit
git commit -m "Primer commit: invitación de boda"

# 5. Crea el repo en GitHub y conecta el remoto
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Archivos que NO deben subirse:

- `.env`
- `node_modules/`
- `uploads/` si tu hosting no conserva archivos permanentes
- `Asistencia/*.xlsx` si se manejan como datos locales de desarrollo
- logs o temporales del entorno local

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. En SQL Editor, ejecuta el contenido de `supabase/schema.sql`.
3. Si quieres cargar datos de ejemplo, ejecuta `supabase/seed.sql`.
4. Crea un bucket llamado `uploads` o usa el nombre indicado en `SUPABASE_BUCKET`.
5. En la configuración del proyecto usa la URL base, no la URL con `/rest/v1`.
6. La conexión del backend usa la clave de servicio del proyecto, y las políticas RLS están orientadas a permitir lectura pública y escrituras autenticadas desde el backend.

### SQL base para Supabase

Archivo recomendado:

- `supabase/schema.sql`

Incluye:

- tabla `guests`
- tabla `songs`
- tabla `messages`
- tabla `settings`
- índices y restricciones básicas
- políticas RLS mínimas para uso con backend autenticado

## Notas importantes para producción

La aplicación usa almacenamiento local del servidor para:

- `Asistencia/Asistencia.xlsx`
- `wedding-settings.json`
- `uploads/`

Estos archivos deben guardarse en un disco persistente o migrarse a Supabase para que no desaparezcan entre reinicios y despliegues.

## Seguridad y despliegue

- Nunca subas el archivo `.env` ni `node_modules/` a GitHub.
- Usa credenciales fuertes para `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `SESSION_SECRET`.
- Mantén los datos operativos y archivos de usuario en Supabase o en un disco persistente.
- Si usas GitHub Actions o un hosting externo, guarda las variables reales como secretos del repositorio.

## Guía rápida para producción con GitHub + Supabase

### 1) Preparar el repositorio

```bash
git init
git add .
git commit -m "Proyecto listo para producción"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

### 2) Crear el proyecto en Supabase

1. Inicia sesión en Supabase.
2. Crea un nuevo proyecto.
3. En SQL Editor ejecuta `supabase/schema.sql`.
4. Si quieres cargar datos iniciales, ejecuta `supabase/seed.sql`.
5. Crea un bucket llamado `uploads` para imágenes y QR.

### 3) Configurar variables reales del entorno

Las variables reales no deben subirse a GitHub. Úsalas en el hosting o en variables de entorno del entorno de ejecución.

```env
PORT=3000
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_password_seguro
SESSION_SECRET=tu_clave_segura
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_BUCKET=uploads
```

### 4) Ejecutar la migración inicial

```bash
npm install
npm run migrate:supabase
npm start
```

### 5) Validación final

- Revisa la invitación pública.
- Prueba el login del admin.
- Guarda ajustes desde el panel.
- Verifica si los invitados y mensajes se cargan desde Supabase.
- Confirma que no hay dependencias del Excel en la operación diaria.

### 6) Recomendaciones de despliegue

Este proyecto necesita un host con Node.js para ejecutar `server.js`. GitHub Pages no sirve para el backend ni la administración dinámica.

Recomendación ideal:

- GitHub: repositorio y versionado
- Supabase: base de datos y storage
- Render, Railway o VPS: backend Node.js

No subas `.env`, `node_modules`, `uploads` ni archivos locales sensibles al repositorio.

## Funcionalidades principales

- Personalización del sitio desde el panel admin
- Gestión de invitados y CRM operativo
- Moderación de mensajes públicos
- Sugerencias de canciones
- Galería con fotos activas/inactivas y orden configurable
- Generación automática de QR para álbum y regalos
- Persistencia centralizada en Supabase con fallback local en desarrollo
- Preparación para producción con GitHub + Supabase
