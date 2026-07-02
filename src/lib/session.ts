// Autenticación mínima de un solo passcode (sin usuarios, sin DB).
// Usa Web Crypto (disponible en Node y en el runtime Edge del proxy).

export const SESSION_COOKIE = "reminders_auth";
const SIGNED_MESSAGE = "authenticated";

function requirePassword(): string {
  const pw = process.env.APP_PASSWORD;
  if (!pw) throw new Error("Falta la variable de entorno APP_PASSWORD");
  return pw;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Token de sesión: HMAC del passcode, sólo reproducible conociendo APP_PASSWORD. */
export async function makeSessionToken(): Promise<string> {
  return hmacHex(requirePassword(), SIGNED_MESSAGE);
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await makeSessionToken();
  return timingSafeEqual(token, expected);
}

export async function isValidPassword(candidate: string): Promise<boolean> {
  return timingSafeEqual(candidate, requirePassword());
}
