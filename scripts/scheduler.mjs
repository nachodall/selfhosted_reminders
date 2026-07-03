#!/usr/bin/env node
// Scheduler local: cada INTERVAL segundos le pega a /api/cron/check para
// disparar las notificaciones de los recordatorios vencidos.
//
// Uso:  npm run scheduler   (con el dev server corriendo en otra terminal)
//
// En producción esto lo reemplaza Vercel Cron (ver vercel.json).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carga simple de .env (sin dependencias).
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    /* sin .env, usamos defaults */
  }
}

loadEnv();

const BASE = process.env.SCHEDULER_BASE_URL || "http://localhost:3000";
const SECRET = process.env.CRON_SECRET || "";
const INTERVAL = Number(process.env.SCHEDULER_INTERVAL_SECONDS || 30);

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/cron/check`, {
      method: "POST",
      headers: SECRET ? { authorization: `Bearer ${SECRET}` } : {},
    });
    const ts = new Date().toLocaleTimeString();
    if (!res.ok) {
      console.log(`[${ts}] ${res.status} ${res.statusText}`);
      return;
    }
    const data = await res.json();
    if (data.checked > 0) {
      console.log(
        `[${ts}] ✓ ${data.checked} vencido(s), ${data.delivered} push entregado(s)`
      );
    } else {
      console.log(`[${ts}] · sin recordatorios vencidos`);
    }
  } catch {
    console.log(
      `[${new Date().toLocaleTimeString()}] ✗ ${BASE} no responde (¿está corriendo npm run dev?)`
    );
  }
}

console.log(`scheduler → ${BASE}/api/cron/check cada ${INTERVAL}s. Ctrl+C para salir.`);
tick();
setInterval(tick, INTERVAL * 1000);
