"use client";

import { Gem } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import type { ArtifactSetForReference } from "@/types/info-reference";

export function ArtifactSetReferenceCard({ set }: { set: ArtifactSetForReference }) {
  return (
    <AccordionItem
      value={set.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <EntityIcon src={set.icon} name={set.name} size={40} className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted" fallback={<Gem className="size-5" />} />
          <div className="flex-1 min-w-0">
            <span className="hud-sc block text-sm leading-tight text-hud-ink">
              {set.name}
            </span>
            {set.artifactNames.length > 0 && (
              <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
                Предмети: {set.artifactNames.join(", ")}
              </p>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-hud-line px-3 pt-2 pb-3 text-hud-bone">
          {set.description && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">Опис</Label>
              <p className="text-sm mt-0.5">{set.description}</p>
            </div>
          )}
          {set.bonuses.length > 0 && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">Бонуси сету</Label>
              <ul className="list-disc list-inside text-sm mt-0.5 space-y-0.5">
                {set.bonuses.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
