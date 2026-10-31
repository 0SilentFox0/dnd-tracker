"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { LANDING_PATHS } from "@/lib/constants/site";

const Footer = dynamic(() => import("@/components/layout/Footer").then((m) => m.Footer));

const AUTH_SCREENS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

const BATTLE_PATH = /^\/campaigns\/[^/]+\/battles\/[^/]+$/;

export function FooterGate() {
  const pathname = usePathname();

  if (!pathname || LANDING_PATHS.includes(pathname) || AUTH_SCREENS.some((p) => pathname.startsWith(p)) || BATTLE_PATH.test(pathname) || pathname.includes("/dm/print")) return null;

  return <Footer />;
}
