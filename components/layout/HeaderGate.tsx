"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// split out so the landing and auth pages never download the app header (dropdowns, dialogs, battle/show buttons)
const Header = dynamic(() => import("@/components/layout/Header").then((m) => m.Header));

const AUTH_SCREENS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

export function HeaderGate() {
  const pathname = usePathname();

  if (pathname === "/" || AUTH_SCREENS.some((p) => pathname?.startsWith(p))) return null;

  return <Header />;
}
