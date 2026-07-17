// Service worker — recibe Web Push, muestra la notificación, y cachea
// el shell de la app para poder abrirla sin conexión (solo lectura;
// crear/editar/borrar siguen necesitando red, y ya fallan con un
// mensaje claro del lado de la app).

const CACHE_VERSION = "v1";
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES_CACHE, ASSETS_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// Nunca cachear la API: son datos vivos, y su estado offline ya lo maneja
// la app (localStorage/estado en memoria + mensajes de error).
function isApi(url) {
  return url.pathname.startsWith("/api/");
}

// Assets estáticos con nombre versionado por Next.js: cache-first, nunca
// vencen (si cambia el contenido, cambia el nombre del archivo).
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|webmanifest)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApi(url)) return; // deja pasar tal cual, sin interceptar

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) (await caches.open(ASSETS_CACHE)).put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first: mientras haya conexión, siempre la versión fresca
    // (con tus recordatorios reales). Si falla, servimos la última
    // página que cargó bien — quedan tus recordatorios de esa vez.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) (await caches.open(PAGES_CACHE)).put(request, res.clone());
          return res;
        } catch {
          const cached = await caches.match(request);
          return cached || Response.error();
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Recordatorio", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    if (event.data) data = { title: "Recordatorio", body: event.data.text() };
  }

  const title = data.title || "Recordatorio";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.reminderId || undefined,
    requireInteraction: false,
    data: { url: "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })()
  );
});
