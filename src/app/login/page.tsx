"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("passcode incorrecto");
        return;
      }
      router.replace(params.get("next") || "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-5">
      <h1 className="mb-6 text-lg">
        <span style={{ color: "var(--accent)" }}>~/</span>reminders
        <span className="cursor" />
      </h1>

      <form onSubmit={submit} className="border-t border-b py-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-baseline gap-2">
          <span style={{ color: "var(--accent)" }}>$</span>
          <input
            type="password"
            className="term-input"
            placeholder="passcode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" className="term-btn shrink-0" disabled={busy || !password}>
            {busy ? "…" : "enter"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--danger)" }}>
          ! {error}
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
