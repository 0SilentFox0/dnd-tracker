import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
  campaignRequest,
} from "@/lib/api/client";
import type { Spell, SpellGroup } from "@/types/spells";

export async function updateSpellAppearance(
  campaignId: string,
  spellId: string,
  appearanceDescription: string | null,
): Promise<Spell> {
  return campaignPatch<Spell>(campaignId, `/spells/${spellId}`, {
    appearanceDescription,
  });
}

export async function getSpells(campaignId: string): Promise<Spell[]> {
  return campaignGet<Spell[]>(campaignId, "/spells");
}

export async function getSpellGroups(
  campaignId: string,
): Promise<SpellGroup[]> {
  return campaignGet<SpellGroup[]>(campaignId, "/spells/groups");
}

export async function createSpellGroup(
  campaignId: string,
  data: { name: string },
): Promise<SpellGroup> {
  return campaignPost<SpellGroup>(campaignId, "/spells/groups", data);
}

export async function renameSpellGroup(
  campaignId: string,
  groupId: string,
  name: string,
): Promise<SpellGroup> {
  return campaignPatch<SpellGroup>(
    campaignId,
    `/spells/groups/${groupId}`,
    { name: name.trim() },
  );
}

export async function removeAllSpellsFromGroup(
  campaignId: string,
  groupId: string,
): Promise<{ success: boolean }> {
  return campaignPost<{ success: boolean }>(
    campaignId,
    `/spells/groups/${groupId}/remove-all-spells`,
    {},
  );
}

export async function removeSpellFromGroup(
  campaignId: string,
  spellId: string,
): Promise<Spell> {
  return campaignPost<Spell>(
    campaignId,
    `/spells/${spellId}/remove-from-group`,
    {},
  );
}

export async function moveSpellToGroup(
  campaignId: string,
  spellId: string,
  groupId: string | null,
): Promise<Spell> {
  return campaignPatch<Spell>(campaignId, `/spells/${spellId}`, { groupId });
}

export async function deleteAllSpells(
  campaignId: string,
): Promise<{ success: boolean; deleted: number }> {
  return campaignDelete<{ success: boolean; deleted: number }>(
    campaignId,
    "/spells/delete-all",
  );
}

export async function createSpell(
  campaignId: string,
  data: Partial<Spell> & {
    name: string;
    description: string;
    type: string;
    damageType: string;
  },
): Promise<Spell> {
  return campaignPost<Spell>(campaignId, "/spells", data);
}

export async function getSpell(
  campaignId: string,
  spellId: string,
): Promise<Spell> {
  return campaignGet<Spell>(campaignId, `/spells/${spellId}`);
}

export async function updateSpell(
  campaignId: string,
  spellId: string,
  data: Partial<Spell>,
): Promise<Spell> {
  return campaignPatch<Spell>(campaignId, `/spells/${spellId}`, data);
}

export async function deleteSpell(
  campaignId: string,
  spellId: string,
): Promise<{ success: boolean }> {
  return campaignDelete<{ success: boolean }>(
    campaignId,
    `/spells/${spellId}`,
  );
}

export async function deleteSpellsByLevel(
  campaignId: string,
  level: number,
): Promise<{ success: boolean; deleted: number }> {
  return campaignRequest<{ success: boolean; deleted: number }>(
    campaignId,
    "/spells/delete-by-level",
    { method: "DELETE", body: { level } },
  );
}

export async function importSpells(
  campaignId: string,
  body: { spells: unknown[]; groupId?: string },
): Promise<{ imported: number }> {
  return campaignPost<{ imported: number }>(
    campaignId,
    "/spells/import",
    body,
  );
}
