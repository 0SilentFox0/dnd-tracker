"use client";

import { useProfile } from "./ProfileContext";
import { RacePassive } from "./RacePassive";

import { EntityIcon } from "@/components/common/EntityIcon";
import { ProgressionPanel } from "@/components/skill-tree/progression";

export function SkillsTab({ manage = false }: { manage?: boolean }) {
  const { campaignId, characterId, sheet } = useProfile();

  const personal = sheet.personalSkill;

  return (
    <>
      <RacePassive />
      {personal && (
        <section className="mb-3 flex gap-3 rounded-[10px] border border-hud-gold/40 bg-hud-field p-3">
          <EntityIcon src={personal.icon} name={personal.name} size={48} className="hud-sc size-12 rounded-md border border-hud-line bg-[#2a2016] text-inherit" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-hud-gold">Персональне вміння</p>
            <h3 className="hud-sc text-base text-hud-ink">{personal.name}</h3>
            {personal.description && <p className="mt-1 text-[13px] leading-snug text-[#b8ab95]">{personal.description}</p>}
          </div>
        </section>
      )}
      <div className="-mx-4">
        <ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={manage} />
      </div>
    </>
  );
}
