"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ConfirmContext, type ConfirmOptions } from "@/lib/hooks/common/confirm-context";
import { errorMessage } from "@/lib/utils/common/error-message";

// loaded on the first confirm() so pages that never ask (the landing) skip Radix Dialog + vaul
const ResponsiveDialog = dynamic(() => import("@/components/ui/responsive-dialog").then((m) => m.ResponsiveDialog));

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void; detach?: () => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");

  const [pending, setPending] = useState<Pending | null>(null);

  // last options stay rendered while the dialog/sheet animates closed
  const [shown, setShown] = useState<ConfirmOptions | null>(null);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const current = useRef<Pending | null>(null);

  const settle = useCallback((ok: boolean) => {
    current.current?.detach?.();
    current.current?.resolve(ok);
    current.current = null;
    setPending(null);
    setBusy(false);
    setError(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        if (options.signal?.aborted) return resolve(false);

        current.current?.detach?.();
        current.current?.resolve(false);

        const next: Pending = { ...options, resolve };

        current.current = next;
        setBusy(false);
        setError(null);
        setPending(next);
        setShown(options);

        const onAbort = () => current.current === next && settle(false);

        options.signal?.addEventListener("abort", onAbort, { once: true });
        next.detach = () => options.signal?.removeEventListener("abort", onAbort);
      }),
    [settle],
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
      setError(errorMessage(e, t("confirm.failed")));
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {shown && (
      <ResponsiveDialog
        hud
        role="alertdialog"
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
                {shown?.cancelLabel ?? t("confirm.cancel")}
              </Button>
            )}
            <Button variant={shown?.destructive ? "destructive" : "default"} onClick={accept} disabled={busy}>
              {busy ? "…" : (shown?.confirmLabel ?? t("confirm.confirm"))}
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
      )}
    </ConfirmContext.Provider>
  );
}
