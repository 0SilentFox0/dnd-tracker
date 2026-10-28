"use client";

import { useProfile } from "../ProfileContext";

import { HudSection } from "@/components/hud/form";

const REST_LABEL = { short: "короткий відпочинок", long: "довгий відпочинок" } as const;

export function ChargesList() {
  const { sheet } = useProfile();

  const charges = sheet.rest?.persist ? sheet.rest.charges : [];

  if (charges.length === 0) return null;

  return (
    <HudSection title="ЗАРЯДИ">
      <ul className="text-sm">
        {charges.map((c) => (
          <li key={c.key} className="flex justify-between gap-2 border-b border-[#2a2218] py-1">
            <span className="min-w-0 truncate">{c.name}</span>
            <span className="shrink-0 tabular-nums text-hud-muted">
              {Math.max(0, c.uses - c.used)} / {c.uses} · {c.rest ? REST_LABEL[c.rest] : "не відновлюються"}
            </span>
          </li>
        ))}
      </ul>
    </HudSection>
  );
}
