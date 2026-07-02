# ~/reminders

App de recordatorios personal, mobile-first, con estética de terminal (claro/oscuro
automático). Creás un recordatorio con fecha + descripción, lo ves en el dashboard, y
recibís una **notificación push** cuando llega la hora — en la compu y, una vez
instalada como PWA, en el iPhone. Todo detrás de un passcode simple (no es multiusuario).

Stack: Next.js 16 (App Router) · Prisma · Postgres (prod) / SQLite (dev) · Web Push (VAPID) · Tailwind v4 · Geist Mono.

---

## Correr en local

```bash
npm install
npm run dev          # http://localhost:3000
```

En **otra terminal**, levantá el scheduler (es lo que dispara las notificaciones):

```bash
npm run scheduler
```

### Probar el circuito completo (en Chrome desktop)

Web Push funciona en `localhost` en Chrome/Edge de escritorio, así que podés validar
todo sin un iPhone:

1. Abrí http://localhost:3000.
2. Click en **`[ enable notifications ]`** y aceptá el permiso.
3. Creá un recordatorio con la hora ~1–2 minutos en el futuro y dale **add**.
4. Dejá `npm run scheduler` corriendo. Cuando llegue la hora, aparece la notificación
   del sistema y el recordatorio pasa a la sección **— sent —** (atenuado).

> En **Safari** de escritorio el push web sobre `localhost` es poco confiable; usá
> Chrome o Edge para probar local. En iPhone funciona una vez instalada la PWA (abajo).

---

## Comandos

| Comando             | Qué hace                                             |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Dev server                                           |
| `npm run scheduler` | Loop local que revisa recordatorios vencidos (30s)   |
| `npm run build`     | Build de producción                                  |
| `npm run db:studio` | Prisma Studio (ver/editar la base de datos)          |

## Variables de entorno (`.env`)

Ver `.env.example`. Las claves VAPID se generan con `npx web-push generate-vapid-keys`.
`CRON_SECRET` autentica al scheduler / GitHub Action contra `/api/cron/check`.
`APP_PASSWORD` es el passcode que gatea toda la app (página + API).

---

## Fase 2 — Deploy y notificaciones reales en el iPhone

El push real al iPhone necesita HTTPS público. Pasos:

1. **Base de datos en la nube.** Postgres gratis (Vercel Postgres / Neon). En
   `prisma/schema.prisma` cambiá `provider = "sqlite"` por `"postgresql"`, poné el
   `DATABASE_URL` y corré `npx prisma migrate deploy`.
2. **Deploy a Vercel.** Cargá las env vars: `DATABASE_URL`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`,
   `APP_PASSWORD`.
3. **Disparador del cron: GitHub Actions**, no Vercel Cron — el plan Hobby de Vercel
   sólo permite cron *diario*, inservible para recordatorios puntuales. En vez de eso,
   [`.github/workflows/cron-check.yml`](.github/workflows/cron-check.yml) pega a
   `/api/cron/check` cada 5 minutos. Necesita dos secrets en el repo de GitHub
   (Settings → Secrets and variables → Actions):
   - `APP_URL` → la URL de producción (ej. `https://self-recordatorios.vercel.app`)
   - `CRON_SECRET` → el mismo valor que en Vercel
4. **Instalar la PWA en el iPhone** (iOS 16.4+):
   Abrí la URL en **Safari** → ingresá el passcode → botón Compartir → **Agregar a
   inicio** → abrí la app desde el ícono → tocá **`[ enable notifications ]`** y aceptá.
   (En iOS el permiso de notificaciones sólo se puede dar desde la PWA instalada.)
5. Creá un recordatorio y confirmá que la notificación llega (puede demorar hasta 5
   minutos, según cuándo caiga el próximo tick del GitHub Action — o disparalo a mano
   desde la pestaña Actions del repo con "Run workflow").

## Arquitectura

```
src/app/
  page.tsx                  Dashboard (server: carga inicial desde Prisma)
  layout.tsx                Fuente, metadata PWA, theme-color
  globals.css                Tema terminal claro/oscuro
  login/page.tsx             Pantalla de passcode
  api/
    auth/login/route.ts      Valida el passcode y setea la cookie de sesión
    reminders/route.ts       GET (listar) · POST (crear)
    reminders/[id]/route.ts  DELETE
    push/subscribe/route.ts  POST (guarda la suscripción del navegador)
    cron/check/route.ts      Manda push de los vencidos y los marca como enviados
src/proxy.ts                 Gatea toda la app detrás del passcode (cookie firmada)
src/components/               Dashboard, Composer, ReminderList, NotificationBar
src/lib/                      prisma, push (server), client-push, session, format, types
public/sw.js                  Service worker (recibe push, muestra la notificación)
public/manifest.webmanifest   Manifest de la PWA
scripts/scheduler.mjs         Cron local para dev
.github/workflows/cron-check.yml  Cron real en producción (cada 5 min)
```
