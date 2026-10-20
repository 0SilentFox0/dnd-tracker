"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "./useConfirm";

const CONFIRM = { title: "Є незбережені зміни. Вийти без збереження?", confirmLabel: "Вийти", destructive: true };

const MODIFIED = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/** Поки active: закриття вкладки, клік по внутрішньому посиланню і «Назад» питають підтвердження. */
export function useUnsavedChangesGuard(active: boolean): void {
  const router = useRouter();

  const confirm = useConfirm();

  const latest = useRef({ router, confirm });

  useEffect(() => {
    latest.current = { router, confirm };
  });

  useEffect(() => {
    if (!active) return;

    const warn = (e: BeforeUnloadEvent) => e.preventDefault();

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || MODIFIED(e)) return;

      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;

      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;

      e.preventDefault();
      e.stopPropagation();

      void latest.current.confirm(CONFIRM).then((ok) => ok && latest.current.router.push(url.pathname + url.search + url.hash));
    };

    // sentinel у історії: «Назад» спершу знімає його, а ми питаємо підтвердження
    const pushSentinel = () => window.history.pushState(window.history.state, "", window.location.href);

    let asking = false;

    const onPopState = () => {
      if (asking) return;

      asking = true;

      void latest.current.confirm(CONFIRM).then((ok) => {
        asking = false;

        if (!ok) return pushSentinel();

        window.removeEventListener("popstate", onPopState);
        window.history.back();
      });
    };

    pushSentinel();
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active]);
}
