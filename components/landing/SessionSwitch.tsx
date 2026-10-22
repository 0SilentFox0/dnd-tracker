"use client";

import type { ReactNode } from "react";

import { useHasSessionCookie } from "@/lib/hooks/auth";

export function SessionSwitch({ guest, member }: { guest: ReactNode; member: ReactNode }) {
  return useHasSessionCookie() ? member : guest;
}
