"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";
import { ZoneTriggerEditor } from "../ZoneTriggerEditor";

import { useTranslator } from "@/lib/i18n/use-translator";

export function AnchoredZoneEditor({ effect, path, onChange }: SpellOnlyEditorProps<"anchoredZone">) {
  const t = useTranslator("editors");

  const owner = { kind: "anchoredZone", effect, path } as const;

  return (
    <>
      <SpellOnlyField owner={owner} field={{ name: "radiusFeet", input: "number" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "side", input: "select", options: ["enemies", "allies", "all"] }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "duration", input: "duration" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "excludeBearer", input: "toggle" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "endsWhenStartOutside", input: "toggle" }} onChange={onChange} />
      <ZoneTriggerEditor value={effect.onEnter} path={`${path}.onEnter`} label={t("spellEffects.fields.anchoredZone.onEnter")} onChange={(onEnter) => onChange({ ...effect, onEnter })} />
      <ZoneTriggerEditor value={effect.onTurnStart} path={`${path}.onTurnStart`} label={t("spellEffects.fields.anchoredZone.onTurnStart")} onChange={(onTurnStart) => onChange({ ...effect, onTurnStart })} />
    </>
  );
}
