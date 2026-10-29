import { useTranslations } from "next-intl";

import { EntityIcon } from "@/components/common/EntityIcon";
import type { RacePassiveAbility } from "@/types/races";

function Described({ title, icon, description, appearance }: { title: string; icon?: string | null; description?: string; appearance?: string }) {
  const t = useTranslations("races");

  return (
    <div className="space-y-1 rounded-md bg-hud-field px-2.5 py-2">
      <div className="flex items-center gap-2">
        {icon && <EntityIcon src={icon} name={title} size={32} className="size-8 shrink-0 rounded-md border border-hud-line" />}
        <p className="text-sm font-medium text-hud-ink">{title}</p>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-hud-bone">{t("passive.whatItDoes")}</span>{" "}
          {description}
        </p>
      )}
      {appearance && (
        <p className="text-sm italic text-muted-foreground">
          <span className="font-medium not-italic text-hud-bone">{t("passive.appearance")}</span>{" "}
          {appearance}
        </p>
      )}
    </div>
  );
}

export function RacePassiveBlock({ passive }: { passive: RacePassiveAbility }) {
  const t = useTranslations("races");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("passive.title")}</p>
      <Described title={passive.name ?? t("passive.defaultName")} icon={passive.icon} description={passive.description} appearance={passive.appearanceDescription} />
    </div>
  );
}
