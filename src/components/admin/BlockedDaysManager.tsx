"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateLabel } from "@/lib/availability";

type BlockedDay = {
  id: string;
  date: string;
  note: string | null;
  createdAt: string;
};

export function BlockedDaysManager() {
  const [days, setDays] = useState<BlockedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/blocked-days");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not load blocked days.");
      }
      const data = (await res.json()) as { blockedDays: BlockedDay[] };
      setDays(data.blockedDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blocked-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note: note.trim() || null }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not block that day.");
      }
      setDate("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(iso: string) {
    if (!confirm(`Unblock ${formatDateLabel(iso)} so customers can book it?`)) {
      return;
    }
    setRemoving(iso);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/blocked-days?date=${encodeURIComponent(iso)}`,
        { method: "DELETE" },
      );
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not unblock that day.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove.");
    } finally {
      setRemoving(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted">
        Block days when the kitchen is closed for personal time, travel, or
        other reasons. Blocked dates disappear from public checkout (and order
        placement is rejected). Existing orders on those days are not changed —
        contact customers separately if needed.
      </p>

      <form
        onSubmit={onAdd}
        className="rounded-2xl border border-linen bg-cream p-5 shadow-sm"
      >
        <h2 className="font-display text-lg text-espresso">Block a day</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-espresso">Date</span>
            <input
              type="date"
              required
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-linen bg-white px-3 py-2 text-espresso"
            />
          </label>
          <label className="flex flex-[2] flex-col gap-1 text-sm">
            <span className="font-medium text-espresso">
              Note <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Family trip"
              maxLength={200}
              className="rounded-xl border border-linen bg-white px-3 py-2 text-espresso"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !date}
            className="rounded-full bg-crust-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Block day"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section>
        <h2 className="font-display text-lg text-espresso">
          Blocked days
          {!loading && (
            <span className="ml-2 text-sm font-sans font-normal text-muted">
              ({days.length})
            </span>
          )}
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : days.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-linen bg-white/60 px-4 py-8 text-center text-sm text-muted">
            No blocked days yet. The public schedule runs as usual.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-linen rounded-2xl border border-linen bg-white">
            {days.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-espresso">
                    {formatDateLabel(d.date)}
                  </p>
                  <p className="text-xs text-muted">{d.date}</p>
                  {d.note && (
                    <p className="mt-1 text-sm text-muted">{d.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onRemove(d.date)}
                  disabled={removing === d.date}
                  className="rounded-full border border-linen px-3 py-1.5 text-sm text-espresso hover:bg-wheat disabled:opacity-50"
                >
                  {removing === d.date ? "Removing…" : "Unblock"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
