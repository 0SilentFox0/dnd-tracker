"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { type AilmentDraft,AilmentsEditor } from "./AilmentsEditor";
import { EndeavourPicker, isEndeavourValid } from "./EndeavourPicker";
import { PeriodSummaryView } from "./PeriodSummaryView";

import { useProfile } from "@/components/character-profile/ProfileContext";
import { LoadingState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { CharacterType } from "@/lib/constants/characters";
import { useCharacter, useCharacters, useDowntime } from "@/lib/hooks/characters";
import { type Endeavour, readCharacteristics } from "@/lib/utils/rules/systems";

export function DowntimeTab() {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("wfrpDowntime");

  const character = useCharacter(campaignId, characterId);

  const players = useCharacters(campaignId, { type: CharacterType.PLAYER });

  const save = useDowntime(campaignId, characterId);

  const [draft, setDraft] = useState<{ endeavour?: Endeavour; ailments?: AilmentDraft[] }>({});

  if (!character.data) return <LoadingState />;

  const isDM = sheet.viewer.isDM;

  const state = readCharacteristics(character.data).downtime ?? { ailments: [] };

  const endeavour = "endeavour" in draft ? draft.endeavour : state.endeavour;

  const ailments = draft.ailments ?? state.ailments;

  const patients = (players.data ?? []).filter((c) => c.id !== characterId).map((c) => ({ id: c.id, name: c.name }));

  const send = (body: { endeavour: Endeavour | null; ailments?: AilmentDraft[] }) => void save.mutateOk(body).then((ok) => ok && setDraft({}));

  const ailmentsInvalid = ailments.some((a) => !a.label.trim() || !Number.isInteger(a.daysLeft) || a.daysLeft < 1 || a.daysLeft > 365);

  return (
    <div className="px-3 py-3">
      <HudSection title={t("tab.endeavourTitle")}>
        <EndeavourPicker value={endeavour} onChange={(e) => setDraft((d) => ({ ...d, endeavour: e }))} patients={patients} skills={sheet.wfrp?.skills ?? []} />
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" disabled={save.isPending || !isEndeavourValid(endeavour)} onClick={() => send({ endeavour: endeavour ?? null, ...(isDM ? { ailments } : {}) })}>
            {t("tab.save")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={save.isPending || !state.endeavour} onClick={() => send({ endeavour: null })}>
            {t("tab.clear")}
          </Button>
        </div>
        {state.training && <p className="mt-2 text-sm text-hud-bone">{t("tab.trainingCredit", { key: state.training.key, discount: state.training.discount })}</p>}
      </HudSection>
      <HudSection title={t("tab.ailmentsTitle")}>
        <AilmentsEditor value={ailments} editable={isDM} onChange={(a) => setDraft((d) => ({ ...d, ailments: a }))} />
        {isDM && draft.ailments && (
          <Button type="button" size="sm" className="mt-2" disabled={save.isPending || ailmentsInvalid} onClick={() => send({ endeavour: state.endeavour ?? null, ailments: draft.ailments })}>
            {t("tab.save")}
          </Button>
        )}
      </HudSection>
      <HudSection title={t("tab.summaryTitle")}>{state.lastPeriod ? <PeriodSummaryView summary={state.lastPeriod.summary} /> : <p className="text-sm text-hud-muted">{t("tab.noSummary")}</p>}</HudSection>
    </div>
  );
}
