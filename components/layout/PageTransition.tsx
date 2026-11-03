"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Обхід конфлікту aria-hidden: Radix Select викликає hideOthers(), через що
 * на цей div ставлять aria-hidden. Якщо фокус залишається на тригері селекта
 * (нащадку цього div), браузер блокує дропдаун. Спостерігаємо за aria-hidden
 * і знімаємо його, коли фокус всередині контейнера.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  const ref = useRef<HTMLDivElement>(null);

  const lastPathname = useRef(pathname);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const observer = new MutationObserver(() => {
      const active = document.activeElement;

      if (
        el.getAttribute("aria-hidden") === "true" &&
        active &&
        el.contains(active)
      ) {
        el.removeAttribute("aria-hidden");
        el.removeAttribute("data-aria-hidden");
      }
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ["aria-hidden", "data-aria-hidden"],
    });

    return () => observer.disconnect();
  }, []);

  // Перезапуск анімації без `key={pathname}`: ремаунт скидав стан лейаутів (напр. демо-тур під час переходу).
  useEffect(() => {
    const el = ref.current;

    if (!el || lastPathname.current === pathname) return;

    lastPathname.current = pathname;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }, [pathname]);

  return (
    <div ref={ref} className="page-transition">
      {children}
    </div>
  );
}
