"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { HudSection } from "@/components/hud/form";

export function ChargesList() {
  const t = useTranslations("rest.charges");

  const { sheet } = useProfile();

  const charges = sheet.rest?.persist ? sheet.rest.charges : [];

  if (charges.length === 0) return null;

  return (
    <HudSection title={t("title")}>
      <ul className="text-sm">
        {charges.map((c) => (
          <li key={c.key} className="flex justify-between gap-2 border-b border-[#2a2218] py-1">
            <span className="min-w-0 truncate">{c.name}</span>
            <span className="shrink-0 tabular-nums text-hud-muted">
              {t("left", { left: Math.max(0, c.uses - c.used), uses: c.uses })} · {c.rest ? t(c.rest) : t("never")}
            </span>
          </li>
        ))}
      </ul>
    </HudSection>
  );
}
