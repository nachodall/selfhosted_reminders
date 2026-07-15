# ~/reminders

A minimal, **self-hostable** reminders app with a terminal aesthetic. Write a reminder
with a date, see it on a dashboard, and get a **real push notification on your phone**
(installed as a home-screen app, iPhone or Android) or desktop when it's due. No App
Store, no developer account, no company reading your reminders.

Each deploy is a **single-user, passcode-protected** instance — you host your own private
reminders, and each friend hosts their own. Free to run on Vercel + Neon + a free cron
service.

```text
  ~/reminders                                   3 pending

  ● notifications on
  ─────────────────────────────────────────────────────
  $ new reminder…
  @ 2026-07-03, 18:30                              [ add ]
  ─────────────────────────────────────────────────────

  ·  [2026-07-03 18:30]  in 3h
     Renew the domain

  ·  [2026-07-04 09:00]  in 1d
     Call the dentist

  — sent —
  ✓  [2026-07-01 12:00]  sent
     Pay rent
```

*Terminal-on-paper UI, automatic light/dark. Swipe a row left to delete, right to edit.*

---

## Features

- **Terminal aesthetic**, monospace, automatic light/dark (follows the OS).
- **Reminders** = text + date/time, shown on a dashboard (pending / sent).
- **Swipe left to delete, right to edit** — no extra buttons cluttering the UI.
- **Real push notifications** on iPhone and Android (installed as a home-screen app) and
  on desktop browsers.
- **Single-user, passcode-gated** — your instance, your reminders, one password.
- **Zero manual key setup** — Web Push (VAPID) keys are generated automatically.
- **Free to run**: Vercel (hosting) + Neon (Postgres) + a free 1-minute cron.

## How it works

A Next.js app on Vercel stores reminders in Postgres (Neon). A service worker shows the
notifications; the VAPID keys needed for Web Push are generated on first use and stored
in the database — nobody has to run a key-generation command. Vercel's free plan only
allows a cron job **once a day**, way too coarse for reminders, so an external free cron
service pings `/api/cron/check` every minute to fire anything due. The whole app sits
behind a single passcode you choose when you deploy.

---

## Deploy your own

Takes about 10 minutes, no coding required. Each step below is something you click or
paste — nothing to write from scratch.

### 1. Click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnachodall%2Fselfhosted_reminders&env=APP_PASSWORD,CRON_SECRET&envDescription=APP_PASSWORD%20is%20your%20login%20passcode.%20CRON_SECRET%20is%20any%20random%20string%20used%20to%20authenticate%20the%20cron%20trigger.&project-name=reminders&repository-name=reminders)

This copies the code into your own GitHub account and starts creating a Vercel project.

**Before clicking Deploy**, change the suggested project name (top of the import screen)
to something with your name in it, e.g. **`self-reminders-yourusername`**. `reminders`
alone is generic — Vercel will still accept it, but it makes the URL you get
(`your-project-name.vercel.app`) memorable and unambiguously yours, especially if you
ever need to tell a friend or troubleshoot it later.

When it asks for environment variables, set:

- **`APP_PASSWORD`** — the passcode you'll type to open the app. Pick something you're
  comfortable typing on your phone (it doesn't need to be a "secure" password — it's just
  keeping strangers out, not a bank).
- **`CRON_SECRET`** — any random string of letters/numbers. If you can't think of one,
  just mash your keyboard for a few seconds.

Click **Deploy**. The first build will finish, but the app won't fully work yet —
that's expected, keep going.

### 2. Add the database (free)

1. In your new Vercel project, open the **Storage** tab.
2. **Create Database** → choose **Neon** (Postgres) → follow the prompts to create it
   and connect it to your project. This automatically sets the `DATABASE_URL` variable
   for you — you don't need to copy/paste anything.
3. Go to **Deployments** → click the **⋯** menu on the latest one → **Redeploy**.
   This second build sets up the database tables.

Your app is now live at a `https://your-project-name.vercel.app` URL — open it and try
logging in with the passcode you chose.

### 3. Set up the cron (this is what makes notifications actually fire on time)

Without this step, reminders will pile up but never notify you — nothing checks the
clock on its own. **Use [cron-job.org](https://cron-job.org)** (free, no credit card):

1. Create a free account.
2. **Create cronjob**, and fill in:
   - **Title**: `reminders`
   - **URL**: `https://your-project-name.vercel.app/api/cron/check`
   - **Schedule**: every **1 minute**
   - Under **Advanced** → **Headers**, add one:
     - Key: `Authorization`
     - Value: `Bearer YOUR_CRON_SECRET` (the same string you set in step 1)
3. Save. That's it — it'll ping your app every minute from now on.

> A GitHub Actions workflow ([`.github/workflows/cron-check.yml`](.github/workflows/cron-check.yml))
> is also included, but in practice GitHub only runs scheduled workflows on a
> best-effort basis — in testing it fired anywhere from 5 minutes to 2 hours late.
> **cron-job.org is the reliable option**; don't rely on GitHub Actions alone for
> anything time-sensitive.

### 4. Install it on your phone

**iPhone (iOS 16.4+):**
1. Open your URL in **Safari** and enter your passcode.
2. Tap **Share** → **Add to Home Screen**.
3. Open the app from the new icon on your home screen → tap **`[ enable notifications ]`**
   → **Allow**.

   > iOS only lets a website ask for notification permission once it's installed this
   > way — opening it in a regular Safari tab won't offer the option.

**Android (Chrome):**
1. Open your URL in **Chrome** and enter your passcode.
2. Tap **`[ enable notifications ]`** → **Allow**. This works right away in the browser
   — installing it isn't required for notifications, but it's nicer:
3. (Optional) Chrome menu (⋮) → **Add to Home screen**, so it opens like a normal app.

Create a test reminder a couple of minutes out and confirm the notification arrives.

---

## Local development

The database is Postgres (Neon) in both dev and prod. Pull the connection string from
your Vercel project:

```bash
git clone https://github.com/YOUR_USERNAME/reminders reminders
cd reminders
npm install
npx vercel link                 # link to your Vercel project
npx vercel env pull .env.local  # brings DATABASE_URL, APP_PASSWORD, etc.
npm run dev                     # http://localhost:3000
```

In another terminal, run the scheduler (this is what fires notifications locally):

```bash
npm run scheduler
```

Web Push works on `localhost` in **Chrome/Edge desktop**, so you can test the full loop
without a phone: log in → `[ enable notifications ]` → create a reminder ~1–2 min out →
wait for the desktop notification. (Safari on `localhost` is unreliable for Web Push.)

> `vercel env pull` returns Sensitive vars (like `APP_PASSWORD`) empty — fill those in
> `.env.local` by hand.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_PASSWORD` | ✅ | Login passcode; gates the whole app (page + API). |
| `CRON_SECRET` | ✅ | Authenticates the cron trigger against `/api/cron/check`. |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | auto | Injected by the Neon integration on Vercel. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | optional | Auto-generated and stored in the DB if unset. Set only to pin a keypair. |
| `VAPID_SUBJECT` | optional | `mailto:` or URL used in the push payload. |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run scheduler` | Local loop that checks for due reminders (every 30s) |
| `npm run build` | Production build |
| `npm run db:studio` | Prisma Studio (inspect/edit the database) |

## Tech stack

Next.js 16 (App Router) · Prisma · Postgres (Neon) · Web Push (VAPID) · Tailwind v4 · Geist Mono.

## Architecture

```text
src/app/
  page.tsx                        Dashboard (server: initial load from Prisma)
  login/page.tsx                  Passcode screen
  api/
    auth/login/route.ts           Validates the passcode, sets the session cookie
    reminders/route.ts            GET (list) · POST (create)
    reminders/[id]/route.ts       PATCH (edit) · DELETE
    push/subscribe/route.ts       Saves the browser's push subscription
    push/vapid-public-key/route.ts  Returns the VAPID public key (env or DB)
    cron/check/route.ts           Sends push for due reminders, marks them sent
src/proxy.ts                      Gates the whole app behind the passcode (signed cookie)
src/components/                   Dashboard, Composer, ReminderList, NotificationBar
src/lib/                          prisma, push (env→DB→generate), client-push, session, format
public/sw.js                      Service worker (receives push, shows the notification)
public/manifest.webmanifest       PWA manifest
prisma/schema.prisma              Postgres; Reminder, PushSubscription, AppSecret
vercel.json                       buildCommand: migrate (when DB present) + build
.github/workflows/cron-check.yml  Optional cron fallback (unreliable timing, see above)
scripts/scheduler.mjs             Local cron for development
```

## License

[MIT](LICENSE)
