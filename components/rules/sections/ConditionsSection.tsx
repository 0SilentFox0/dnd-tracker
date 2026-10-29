import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { RulesSection } from "../RulesSection";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SwitchField } from "@/components/ui/switch-field";
import { type RulesFormState, useRemoveCustomCondition } from "@/lib/hooks/campaigns";
import { CONDITION_LABELS } from "@/lib/utils/abilities/registry/labels";

const NAMED_CATEGORIES = [
  { key: "spells", label: "usageSpells", path: "spells" },
  { key: "units", label: "usageUnits", path: "units" },
  { key: "skills", label: "usageSkills", path: "skills" },
  { key: "artifacts", label: "usageArtifacts", path: "artifacts" },
  { key: "artifactSets", label: "usageArtifactSets", path: "artifact-sets" },
  { key: "races", label: "usageRaces", path: "races" },
  { key: "feats", label: "usageFeats", path: "feats" },
  { key: "statusEffects", label: "usageStatusEffects", path: null },
] as const;

export function ConditionsSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const tc = useTranslations("rules.customConditions");

  const { remove, isPending, usage, closeUsage } = useRemoveCustomCondition(form.campaignId);

  const [target, setTarget] = useState("");

  const base = `/campaigns/${form.campaignId}`;

  const onRemove = (c: { key: string; name: string }) => {
    setTarget(c.name);
    void remove(c);
  };

  const conditions = form.data.conditions;

  const custom = conditions.custom ?? [];

  return (
    <RulesSection mechanic="conditions">
      <SwitchField id="rules-conditions-enabled" label={t("sections.conditions.enabled")} checked={conditions.enabled} onCheckedChange={(v) => form.set("conditions", { ...conditions, enabled: v })} />
      <SwitchField id="rules-conditions-exhaustion" label={t("sections.conditions.exhaustion")} checked={conditions.exhaustion === "2024"} onCheckedChange={(v) => form.set("conditions", { ...conditions, exhaustion: v ? "2024" : "2014" })} />
      {custom.length > 0 && (
        <div className="mt-3 space-y-2" data-testid="custom-conditions">
          <h4 className="text-sm font-semibold">{t("sections.conditions.custom")}</h4>
          <ul className="space-y-2">
            {custom.map((c) => (
              <li key={c.key} className="rounded border border-hud-line/50 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{c.name}</div>
                  <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={tc("removeAria", { name: c.name })} title={tc("remove")} data-testid={`remove-${c.key}`} onClick={() => onRemove(c)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {c.description && <p className="text-hud-muted">{c.description}</p>}
                {c.markers.length > 0 && <p className="text-xs text-hud-muted">{c.markers.map((m) => CONDITION_LABELS[m]).join(", ")}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ResponsiveDialog
        hud
        open={!!usage}
        onOpenChange={(open) => !open && closeUsage()}
        title={tc("usageTitle", { name: target })}
        description={tc("usageHint")}
        footer={
          <Button type="button" onClick={closeUsage}>
            {tc("close")}
          </Button>
        }
      >
        {usage && (
          <div className="space-y-3 text-sm" data-testid="condition-usage">
            {usage.battles.length > 0 && (
              <section>
                <h4 className="font-semibold">{tc("usageBattles")}</h4>
                <ul className="list-disc pl-5">
                  {usage.battles.map((b) => (
                    <li key={b.id}>
                      <Link className="underline" href={`${base}/battles/${b.id}`}>
                        {b.name}
                      </Link>{" "}
                      ({b.status === "active" ? tc("statusActive") : tc("statusPrepared")}): {b.participants.join(", ")}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {NAMED_CATEGORIES.map(({ key, label, path }) =>
              usage[key].length > 0 ? (
                <section key={key}>
                  <h4 className="font-semibold">{tc(label)}</h4>
                  <ul className="list-disc pl-5">
                    {usage[key].map((item) => (
                      <li key={item.id}>
                        {path ? (
                          <Link className="underline" href={`${base}/dm/${path}/${item.id}`}>
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        )}
      </ResponsiveDialog>
    </RulesSection>
  );
}
