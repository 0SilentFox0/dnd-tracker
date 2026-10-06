"use client";

import { useProfile } from "./ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ProgressionPanel } from "@/components/skill-tree/progression";

export function SkillsTab({ manage = false }: { manage?: boolean }) {
  const { campaignId, characterId, sheet } = useProfile();

  const personal = sheet.personalSkill;

  return (
    <>
      {personal && (
        <section className="mb-3 flex gap-3 rounded-[10px] border border-[#c9b37a]/40 bg-[#1a140f] p-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#4a3c2c] bg-[#2a2016]">
            {personal.icon ? <OptimizedImage src={personal.icon} alt="" width={48} height={48} className="size-full object-cover" /> : <span className="hud-sc">{personal.name[0]}</span>}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-[#c9b37a]">Персональне вміння</p>
            <h3 className="hud-sc text-base text-[#efe5d2]">{personal.name}</h3>
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
