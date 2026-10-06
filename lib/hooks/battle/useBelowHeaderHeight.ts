"use client";

import { useLayoutEffect, useState } from "react";

const headerBottom = () => Math.max(0, Math.round(document.querySelector("header")?.getBoundingClientRect().bottom ?? 0));

// глобальна sticky-шапка з layout займає верх; бій має влізти в решту екрана
export function useBelowHeaderHeight(): string {
  const [bottom, setBottom] = useState(0);

  useLayoutEffect(() => {
    const measure = () => setBottom(headerBottom());

    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  return `calc(100dvh - ${bottom}px)`;
}
