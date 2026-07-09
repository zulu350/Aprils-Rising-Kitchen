"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS } from "@/lib/constants";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl bg-cream p-8 shadow-md ring-1 ring-linen">
        <p className="text-sm font-semibold tracking-wide text-crust-dark uppercase">
          {BUSINESS.shortName}
        </p>
        <h1 className="mt-1 font-display text-3xl text-espresso">
          Kitchen login
        </h1>
        <p className="mt-2 text-sm text-muted">
          Staff only — manage orders for {BUSINESS.name}.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-brown">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-crust-dark py-3 text-sm font-semibold text-white hover:bg-espresso disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
