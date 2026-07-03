import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

// Devuelve la clave pública VAPID para que el cliente se suscriba.
// Queda detrás del passcode (el flujo de suscripción corre logueado).
export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (err) {
    console.error("[push] no se pudo resolver la clave VAPID", err);
    return NextResponse.json({ error: "VAPID no disponible" }, { status: 500 });
  }
}
