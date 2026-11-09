# Nuestras metas

Dashboard de ahorro en pareja. Uno de los dos se va a vivir a Estados Unidos por ~5 años (regresa cada diciembre) y la otra persona se queda en México. Los dos registran a mano lo que van ahorrando para sus metas compartidas y ven, con gráficas simples, que se están cumpliendo.

**En vivo:** https://danielsegundodev-bot.github.io/nuestras-metas/

## Qué hace

- **Anillos de progreso**: uno por meta, con el total ahorrado juntos en el centro. Si una meta pasa del 100%, el anillo da una segunda vuelta y la meta queda como "cumplida".
- **Diciembres juntos**: cuenta regresiva a diciembre y línea de tiempo de los 5 diciembres entre la fecha de mudanza y la de regreso.
- **Metas**: barra de progreso, ahorrado / meta y proyección "A este ritmo: mes año", calculada con el promedio de los últimos 6 meses.
- **Cómo vamos**: ahorro acumulado por mes, separado por persona, con filtro por meta. Aparece a partir del segundo mes con datos.
- **Quién ha aportado**: porcentaje de cada persona, este mes y desde el inicio.
- **Movimientos**:
  - Al tocar uno se abre su detalle: fecha y hora, tipo de cambio y nota.
  - Cada quien edita o borra solo los suyos.
  - "Ver todos" muestra el historial agrupado por mes.
- **Dos monedas**:
  - Cada quien captura en su moneda (USD o MXN).
  - El tipo de cambio USD→MXN se obtiene automáticamente de frankfurter.dev y se guarda en cada movimiento, así que el historial no cambia cuando cambia el dólar.
  - Se puede escribir a mano el tipo de cambio de un movimiento.
  - El botón MXN/USD convierte los totales con el tipo de cambio de hoy.
- **Tiempo real**: lo que agrega uno aparece en el otro celular. Al volver a la app desde segundo plano se recargan los datos.
- **Resumen mensual en PDF**:
  - Está en Ajustes. Trae los totales, las metas, quién aportó y la lista completa de movimientos del mes.
  - En el celular se abre el menú de compartir.
- **App instalable (PWA)**: botón "Instalar". En Android instala directo. En iPhone muestra los pasos para Safari → Compartir → Agregar a inicio.
- **Avatares con emoji** por persona. El color de cada persona se usa en las gráficas.
- **Modo oscuro** automático, diseño estilo iOS, funciona desde 320px de ancho.

## Stack

- **App:** Vite, React 19, TypeScript (strict) y Tailwind CSS v4.
- **Datos y acceso:** Supabase (Auth con correo y contraseña, Postgres con RLS, Realtime).
- **Gráficas y animaciones:** recharts para la gráfica de área; los anillos y las barras son SVG hecho a mano. framer-motion se usa solo en los anillos y las hojas.
- **PDF:** jsPDF y jspdf-autotable, que se cargan solo al generar el PDF.
- **Hosting:** GitHub Pages, publicado con GitHub Actions.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173/nuestras-metas/
npm run test:run   # vitest
npm run build      # tsc + vite build (+ copia 404.html)
npm run lint       # oxlint
```

**Modo demo:**
- Sin `.env.local`, `npm run dev` corre en modo demo: datos falsos en localStorage, dos personas y 14 meses de movimientos, sin login. Así se desarrolla y se toman capturas sin tocar los datos reales.
- Para apuntar a Supabase en local, crea `.env.local` con las mismas variables que `.env.production`.

## Supabase

- **Migraciones** en `supabase/migrations/`. Se corren a mano en el **SQL Editor** de Supabase, porque no se usa el CLI:
  - `0001_init.sql`: tablas, RLS, `is_allowed()`, el trigger que crea el perfil, Realtime y las metas iniciales.
  - `0002_profile_avatar.sql`: columna `avatar` en `profiles`.
- **Acceso:**
  - Los usuarios se crean a mano en *Authentication → Users → Add user* con "Auto Confirm".
  - Los registros públicos y la confirmación de correo están desactivados, así que no se envían correos.
  - Solo los correos que están en `public.allowed_emails` pueden leer o escribir datos (RLS).
- **Llave pública:** `.env.production` contiene la URL y la llave *publishable* de Supabase. Es pública por diseño, porque la seguridad la pone RLS. Nunca se sube la `service_role`.
- **Proyecto despierto:** el workflow `keep-alive.yml` consulta la base cada 3 días, para que el proyecto gratuito no se pause por inactividad.

Más detalle en [`supabase/README.md`](supabase/README.md).

## Despliegue

Cada push a `main` corre `.github/workflows/deploy.yml`: tests, build y publicación en GitHub Pages. Tarda unos 2 minutos.

GitHub Pages guarda el HTML en caché hasta 10 minutos. Si no ves un cambio, cierra la app instalada y vuelve a abrirla.

## Documentos

- [`docs/SPEC.md`](docs/SPEC.md): especificación del producto y el modelo de datos.
- [`docs/DESIGN.md`](docs/DESIGN.md): sistema de diseño (colores, tipografía, layout, principios).
- [`CLAUDE.md`](CLAUDE.md): contexto y reglas para Claude Code.
