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
5. Configura las políticas de acceso para permitir lectura pública de contenido de la invitación y escritura desde el backend administrado.

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

## Funcionalidades principales

- Personalización del sitio desde el panel admin
- Gestión de invitados y CRM operativo
- Moderación de mensajes públicos
- Sugerencias de canciones
- Galería con fotos activas/inactivas y orden configurable
- Generación automática de QR para álbum y regalos
- Persistencia centralizada en Excel + JSON
- Preparación para migración a Supabase con esquema SQL y variables de entorno
