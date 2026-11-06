# Supabase — configuración

Pasos para conectar **Nuestras metas** a un proyecto de Supabase. Todo se hace desde el panel web; no hace falta la CLI.

## 1. Crear el proyecto

1. Entra a <https://supabase.com/dashboard> y crea un proyecto nuevo (región cercana, p. ej. `us-east-1`).
2. Guarda la contraseña de la base de datos en un lugar seguro (no se usa en la app).

## 2. Crear las tablas

1. Abre **SQL Editor → New query**.
2. Copia y pega todo el contenido de [`migrations/0001_init.sql`](./migrations/0001_init.sql) y presiona **Run**.
   - Se puede volver a ejecutar sin problema: no duplica datos.
   - Crea las tablas, las políticas RLS, las metas **Casa 🏡** y **Boda 💍**, y activa realtime.

## 3. Dar acceso a los dos correos

En el mismo SQL Editor (cambia los correos por los reales):

```sql
insert into public.allowed_emails (email) values
  ('daniel@ejemplo.com'),
  ('ella@ejemplo.com')
on conflict do nothing;
```

Opcional — fechas de mudanza y regreso (también se editan desde la app):

```sql
update public.settings set move_date = '2026-01-15', return_date = '2031-01-15' where id = 1;
```

## 4. Autenticación

1. **Authentication → Sign In / Providers → Email**: debe estar **activado** (enlace mágico).
2. No hace falta (ni conviene) desactivar los registros: con enlace mágico cualquiera puede recibir un correo de acceso, pero **RLS bloquea todos los datos** a quien no esté en `allowed_emails`. Esa persona solo verá la pantalla “Esta cuenta no tiene acceso”.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://danielsegundodev-bot.github.io/nuestras-metas/`
   - **Redirect URLs** (agrega ambas):
     - `https://danielsegundodev-bot.github.io/nuestras-metas/`
     - `http://localhost:5173/nuestras-metas/`

## 5. Variables de entorno

En **Project Settings → API** copia la **Project URL** y la **anon public key**.

- Local: crea `.env.local` en la raíz del repo (nunca se sube a git):

  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```

- GitHub: **Settings → Secrets and variables → Actions → New repository secret**, crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores.
- GitHub Pages: **Settings → Pages → Source: GitHub Actions**.

La anon key es pública por diseño; la seguridad la dan las políticas RLS.

Sin estas variables la app arranca en **modo demo** con datos de ejemplo guardados en el navegador.

## Notas

- Cada usuario nuevo recibe un perfil automático (nombre = parte del correo antes de `@`, moneda MXN). Se puede cambiar desde la app.
- Solo quien registró un movimiento puede editarlo o borrarlo.
