"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ConfirmContext, type ConfirmOptions } from "@/lib/hooks/common/confirm-context";

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  // last options stay rendered while the dialog/sheet animates closed
  const [shown, setShown] = useState<ConfirmOptions | null>(null);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const current = useRef<Pending | null>(null);

  const settle = useCallback((ok: boolean) => {
    current.current?.resolve(ok);
    current.current = null;
    setPending(null);
    setBusy(false);
    setError(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        current.current?.resolve(false);

        const next = { ...options, resolve };

        current.current = next;
        setBusy(false);
        setError(null);
        setPending(next);
        setShown(options);
      }),
    [],
  );

  useEffect(() => () => current.current?.resolve(false), []);

  const accept = async () => {
    const p = current.current;

    if (!p) return;

    if (!p.onConfirm) return settle(true);

    setBusy(true);
    setError(null);

    try {
      await p.onConfirm();

      if (current.current === p) settle(true);
    } catch (e) {
      if (current.current !== p) return;

      setBusy(false);
      setError(e instanceof Error && e.message ? e.message : "Не вдалося виконати дію");
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ResponsiveDialog
        hud
        open={pending !== null}
        onOpenChange={(open) => !open && settle(false)}
        title={shown?.title ?? ""}
        description={shown?.description}
        size="sm"
        dismissible={!busy}
        footer={
          <>
            {shown?.cancelLabel === null ? null : (
              <Button variant="outline" onClick={() => settle(false)} disabled={busy}>
                {shown?.cancelLabel ?? "Скасувати"}
              </Button>
            )}
            <Button variant={shown?.destructive ? "destructive" : "default"} onClick={accept} disabled={busy}>
              {busy ? "…" : (shown?.confirmLabel ?? "Підтвердити")}
            </Button>
          </>
        }
      >
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </ResponsiveDialog>
    </ConfirmContext.Provider>
  );
}
