"use client";

import { useSyncExternalStore } from "react";

const SESSION_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

const subscribe = () => () => {};

// static pages can't read the session on the server; the cookie's presence is enough to swap a link
export function useHasSessionCookie(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => SESSION_COOKIE.test(document.cookie),
    () => false,
  );
}
