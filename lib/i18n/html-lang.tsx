"use client";

import { useEffect } from "react";

import type { Locale } from "./config";

const store: { locks: Locale[]; root: Locale | null } = { locks: [], root: null };

function applyLang() {
  const lang = store.locks.at(-1) ?? store.root;

  if (lang) document.documentElement.lang = lang;
}

export function resetHtmlLangForTests() {
  store.locks = [];
  store.root = null;
}

// a locked page locale (static landing) outranks the cookie-driven root provider; locks stack
export function HtmlLang({ locale, lock = false }: { locale: Locale; lock?: boolean }) {
  useEffect(() => {
    if (!lock) {
      store.root = locale;
      applyLang();

      return;
    }

    const entry = locale;

    store.locks.push(entry);
    applyLang();

    return () => {
      const index = store.locks.lastIndexOf(entry);

      if (index !== -1) store.locks.splice(index, 1);

      applyLang();
    };
  }, [locale, lock]);

  return null;
}
