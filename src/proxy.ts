import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

// Gatea toda la app detrás de un único passcode (APP_PASSWORD).
// Excluye /login, el propio endpoint de login, el cron (tiene su propio
// bearer token) y los assets estáticos de la PWA (ver matcher abajo).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth/login|api/cron|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png).*)",
  ],
};
