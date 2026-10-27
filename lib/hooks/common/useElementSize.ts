"use client";

import { useEffect, useRef, useState } from "react";

const ZERO = { width: 0, height: 0 };

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const [size, setSize] = useState(ZERO);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const sync = () => {
      const { width, height } = el.getBoundingClientRect();

      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    };

    sync();

    const observer = new ResizeObserver(sync);

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
