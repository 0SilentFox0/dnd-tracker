"use client";

import { useState } from "react";

import { SpellGroupDialog } from "./SpellGroupDialog";

import { QueryState } from "@/components/common/states";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { SPELL_GROUP_FALLBACK_COLOR } from "@/lib/constants/spell-groups";
import { useSpellGroups } from "@/lib/hooks/spells";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
import type { SpellGroup } from "@/types/spells";

export function SpellGroupList({ campaignId }: { campaignId: string }) {
  const query = useSpellGroups(campaignId);

  const [editing, setEditing] = useState<SpellGroup | null>(null);

  return (
    <>
      <QueryState query={query}>
        {(groups) => (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const Icon = getSpellGroupIcon(group);

              return (
                <HudCard key={group.id}>
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: group.color ?? SPELL_GROUP_FALLBACK_COLOR }} />
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{group.name}</span>
                    <Button size="sm" variant="outline" onClick={() => setEditing(group)}>
                      Редагувати
                    </Button>
                  </div>
                </HudCard>
              );
            })}
          </div>
        )}
      </QueryState>
      {editing && <SpellGroupDialog key={editing.id} campaignId={campaignId} group={editing} onOpenChange={(open) => !open && setEditing(null)} />}
    </>
  );
}
