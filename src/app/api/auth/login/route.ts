import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidPassword, makeSessionToken } from "@/lib/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { password } = (body ?? {}) as { password?: string };
  if (!password || !(await isValidPassword(password))) {
    return NextResponse.json({ error: "Passcode incorrecto" }, { status: 401 });
  }

  const token = await makeSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400, // 400 días (máximo aceptado por los navegadores)
  });
  return res;
}
