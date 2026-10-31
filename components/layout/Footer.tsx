"use client";

import { LocaleSwitcher } from "@/components/common/LocaleSwitcher";
import { PaletteSwitcher } from "@/components/common/PaletteSwitcher";
import { useSessionEmail } from "@/lib/hooks/auth";

export function Footer() {
  const email = useSessionEmail();

  return (
    <footer className="relative z-10 flex items-center justify-end gap-2 border-t border-hud-rule bg-hud-page/90 px-4 py-3 print:hidden">
      <LocaleSwitcher />
      {email && <PaletteSwitcher />}
    </footer>
  );
}
