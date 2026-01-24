"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { getBackgroundImageUrl } from "@/lib/utils/common/background-image";

/**
 * Компонент для динамічної зміни фонового зображення на основі поточного роуту
 */
export function BackgroundImage() {
  const pathname = usePathname();

  const backgroundUrl = getBackgroundImageUrl(pathname);

  useEffect(() => {
    // Встановлюємо фонове зображення через CSS змінну
    document.documentElement.style.setProperty("--background-image-url", `url("${backgroundUrl}")`);
  }, [backgroundUrl]);

  return null;
}
