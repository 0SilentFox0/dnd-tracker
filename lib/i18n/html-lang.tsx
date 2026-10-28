"use client";

import { useEffect } from "react";

import type { Locale } from "./config";

const LOCK_ATTRIBUTE = "data-lang-lock";

// effects run child-first: an explicit page locale (static landing) must not be overwritten by the cookie-driven root provider
export function HtmlLang({ locale, lock = false }: { locale: Locale; lock?: boolean }) {
  useEffect(() => {
    const root = document.documentElement;

    if (lock) {
      root.lang = locale;
      root.setAttribute(LOCK_ATTRIBUTE, "");

      return () => root.removeAttribute(LOCK_ATTRIBUTE);
    }

    if (!root.hasAttribute(LOCK_ATTRIBUTE)) root.lang = locale;
  }, [locale, lock]);

  return null;
}
