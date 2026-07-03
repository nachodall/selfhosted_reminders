import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type Vapid = { publicKey: string; privateKey: string };

let cached: Vapid | null = null;

/**
 * Resuelve el par de claves VAPID con esta prioridad:
 *   1. env  (compat con instancias que ya las tienen — no regenera nada)
 *   2. DB   (fila singleton AppSecret)
 *   3. genera + persiste  (self-hosting sin configurar nada a mano)
 */
async function getVapid(): Promise<Vapid> {
  if (cached) return cached;

  const envPublic =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  if (envPublic && envPrivate) {
    cached = { publicKey: envPublic, privateKey: envPrivate };
    return cached;
  }

  const existing = await prisma.appSecret.findUnique({ where: { id: 1 } });
  if (existing) {
    cached = { publicKey: existing.vapidPublic, privateKey: existing.vapidPrivate };
    return cached;
  }

  // Generar y guardar. El upsert con id fijo evita duplicados si dos
  // instancias serverless lo hacen a la vez (una gana, la otra reusa).
  const keys = webpush.generateVAPIDKeys();
  const row = await prisma.appSecret.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, vapidPublic: keys.publicKey, vapidPrivate: keys.privateKey },
  });
  cached = { publicKey: row.vapidPublic, privateKey: row.vapidPrivate };
  return cached;
}

/** Clave pública VAPID (la genera/lee si hace falta). La usa el cliente para suscribirse. */
export async function getVapidPublicKey(): Promise<string> {
  return (await getVapid()).publicKey;
}

async function configure() {
  const { publicKey, privateKey } = await getVapid();
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export type PushPayload = {
  title: string;
  body: string;
  reminderId?: string;
};

/**
 * Manda una notificación a todas las suscripciones guardadas.
 * Limpia las suscripciones que el push service reporta como expiradas (404/410).
 */
export async function sendToAll(payload: PushPayload): Promise<number> {
  await configure();
  const subs = await prisma.pushSubscription.findMany();
  let delivered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        delivered++;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[push] error enviando a", sub.endpoint, statusCode ?? err);
        }
      }
    })
  );

  return delivered;
}
