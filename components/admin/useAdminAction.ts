"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAdmin } from "./AdminFrame";

// One place for "send a change to the API, show the server's reason if it is refused, refresh".
export function useAdminAction() {
  const router = useRouter();
  const { t } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(
    async (url: string, method: string, body?: unknown, options: { json?: boolean } = {}): Promise<{ ok: boolean; data: { error?: string; url?: string } | null }> => {
      setBusy(true);
      setMessage(null);
      try {
        const isJson = options.json !== false;
        const response = await fetch(url, {
          method,
          headers: isJson && body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body === undefined ? undefined : isJson ? JSON.stringify(body) : (body as BodyInit)
        });
        const data = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
        if (!response.ok) {
          setMessage(data?.error ?? t.couldNotSave);
          return { ok: false, data };
        }
        router.refresh();
        return { ok: true, data };
      } catch {
        setMessage(t.noConnection);
        return { ok: false, data: null };
      } finally {
        setBusy(false);
      }
    },
    [router, t]
  );

  return { busy, message, setMessage, run };
}
