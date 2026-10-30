"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/common/LocaleSwitcher";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Input } from "@/components/ui/input";
import { SelectField, type SelectOptionGroup } from "@/components/ui/select-field";
import { useTimeZoneSetting } from "@/lib/hooks/common";

const AUTO = "auto";

function zoneGroups(filter: string, current: string | null): SelectOptionGroup[] {
  const query = filter.trim().toLowerCase();

  const zones = new Set(Intl.supportedValuesOf("timeZone"));

  if (current) zones.add(current);

  const byRegion = new Map<string, string[]>();

  for (const zone of zones) {
    if (query && !zone.toLowerCase().includes(query) && zone !== current) continue;

    const region = zone.includes("/") ? zone.split("/")[0] : "UTC";

    byRegion.set(region, [...(byRegion.get(region) ?? []), zone]);
  }

  return [...byRegion].map(([label, list]) => ({ label, options: list.map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") })) }));
}

export function PreferencesClient() {
  const t = useTranslations("auth.settings.preferences");

  const { timeZone, browserZone, set } = useTimeZoneSetting();

  const [filter, setFilter] = useState("");

  const groups = useMemo(() => zoneGroups(filter, timeZone), [filter, timeZone]);

  return (
    <HudPage width="md">
      <HudPageHeader title={t("title")} subtitle={t("subtitle")} />
      <HudPanel className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-hud-muted">{t("language")}</p>
          <LocaleSwitcher />
        </div>
        <div className="space-y-2">
          <label htmlFor="time-zone" className="text-sm text-hud-muted">
            {t("timeZone")}
          </label>
          <Input aria-label={t("search")} placeholder={t("search")} value={filter} onChange={(e) => setFilter(e.target.value)} />
          <SelectField
            id="time-zone"
            value={timeZone ?? AUTO}
            onValueChange={(value) => void set(value === AUTO ? null : value)}
            groups={[{ label: t("autoGroup"), options: [{ value: AUTO, label: t("auto", { zone: browserZone }) }] }, ...groups]}
          />
          <p className="text-xs text-hud-muted">{t("hint")}</p>
        </div>
      </HudPanel>
    </HudPage>
  );
}
