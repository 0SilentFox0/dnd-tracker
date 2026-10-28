import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
  campaignRequest,
  createCampaignCrudApi,
} from "@/lib/api/client";
import { SPELL_IDS_QUERY_MAX } from "@/lib/constants/spells";
import type { CreateSpellInput, UpdateSpellInput } from "@/lib/schemas/spells";
import type { BookSpell, Spell, SpellGroup } from "@/types/spells";

const spellsApi = createCampaignCrudApi<Spell, CreateSpellInput, UpdateSpellInput, { ok: true }>("/spells");

export const getSpells = spellsApi.list;
export const getSpell = spellsApi.get;
export const createSpell = spellsApi.create;
export const updateSpell = spellsApi.update;
export const deleteSpell = spellsApi.remove;

export async function updateSpellAppearance(
  campaignId: string,
  spellId: string,
  appearanceDescription: string | null,
): Promise<Spell> {
  return campaignPatch<Spell>(campaignId, `/spells/${spellId}`, {
    appearanceDescription,
  });
}

export async function getSpellsByIds(campaignId: string, ids: string[]): Promise<BookSpell[]> {
  const chunks: string[][] = [];

  for (let i = 0; i < ids.length; i += SPELL_IDS_QUERY_MAX) chunks.push(ids.slice(i, i + SPELL_IDS_QUERY_MAX));

  const pages = await Promise.all(chunks.map((chunk) => campaignGet<BookSpell[]>(campaignId, `/spells?ids=${chunk.map(encodeURIComponent).join(",")}`)));

  return pages.flat();
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

export async function updateSpellGroup(
  campaignId: string,
  groupId: string,
  data: { name?: string; color?: string | null; icon?: string | null },
): Promise<SpellGroup> {
  return campaignPatch<SpellGroup>(campaignId, `/spells/groups/${groupId}`, data);
}

export async function removeAllSpellsFromGroup(
  campaignId: string,
  groupId: string,
): Promise<{ ok: boolean }> {
  return campaignPost<{ ok: boolean }>(
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
): Promise<{ ok: true; deleted: number }> {
  return campaignDelete<{ ok: true; deleted: number }>(campaignId, "/spells");
}

export async function deleteSpellsByLevel(
  campaignId: string,
  level: number,
): Promise<{ ok: true; deleted: number }> {
  return campaignRequest<{ ok: true; deleted: number }>(
    campaignId,
    "/spells/delete-by-level",
    { method: "DELETE", body: { level } },
  );
}
