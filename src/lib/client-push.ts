// Utilidades de Web Push del lado del cliente.

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushSupport = "ok" | "unsupported" | "needs-install";

/** Detecta si el navegador puede recibir push. En iOS hace falta instalar la PWA. */
export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasApi = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!hasApi) {
    // iOS < 16.4 o Safari sin la PWA instalada no exponen PushManager.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error -- propiedad no estándar de Safari iOS
      window.navigator.standalone === true;
    if (isIOS && !isStandalone) return "needs-install";
    return "unsupported";
  }
  return "ok";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("[push] no se pudo registrar el service worker", err);
    return null;
  }
}

export async function currentPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export async function isSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "no-key" | "error" };

/** Pide permiso, registra el SW, se suscribe y manda la suscripción al servidor. */
export async function enablePush(): Promise<SubscribeResult> {
  if (checkPushSupport() !== "ok") return { ok: false, reason: "unsupported" };

  try {
    // La clave pública VAPID se resuelve en el server (env o auto-generada en DB).
    const keyRes = await fetch("/api/push/vapid-public-key");
    const key = keyRes.ok ? (await keyRes.json()).publicKey : null;
    if (!key) return { ok: false, reason: "no-key" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub),
    });
    if (!res.ok) return { ok: false, reason: "error" };

    return { ok: true };
  } catch (err) {
    console.error("[push] error al habilitar", err);
    return { ok: false, reason: "error" };
  }
}
