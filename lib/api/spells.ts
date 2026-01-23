import type { Spell, SpellGroup } from "@/types/spells";

export async function getSpells(campaignId: string): Promise<Spell[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/spells`);

  if (!response.ok) throw new Error("Failed to fetch spells");

  return response.json();
}

export async function getSpellGroups(campaignId: string): Promise<SpellGroup[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/spells/groups`);

  if (!response.ok) throw new Error("Failed to fetch spell groups");

  return response.json();
}

export async function renameSpellGroup(
  campaignId: string,
  groupId: string,
  name: string
): Promise<SpellGroup> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/groups/${groupId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }
  );

  if (!response.ok) throw new Error("Failed to rename group");

  return response.json();
}

export async function removeAllSpellsFromGroup(
  campaignId: string,
  groupId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/groups/${groupId}/remove-all-spells`,
    {
      method: "POST",
    }
  );

  if (!response.ok) throw new Error("Failed to remove all spells from group");

  return response.json();
}

export async function removeSpellFromGroup(
  campaignId: string,
  spellId: string
): Promise<Spell> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/${spellId}/remove-from-group`,
    {
      method: "POST",
    }
  );

  if (!response.ok) throw new Error("Failed to remove spell from group");

  return response.json();
}

export async function moveSpellToGroup(
  campaignId: string,
  spellId: string,
  groupId: string | null
): Promise<Spell> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/${spellId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    }
  );

  if (!response.ok) throw new Error("Failed to move spell");

  return response.json();
}

export async function deleteAllSpells(
  campaignId: string
): Promise<{ success: boolean; deleted: number }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/delete-all`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) throw new Error("Failed to delete all spells");

  return response.json();
}

export async function createSpell(
  campaignId: string,
  data: Partial<Spell> & { name: string; description: string; type: string; damageType: string }
): Promise<Spell> {
  const response = await fetch(`/api/campaigns/${campaignId}/spells`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to create spell");
  }

  return response.json();
}

export async function getSpell(
  campaignId: string,
  spellId: string
): Promise<Spell> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/${spellId}`
  );

  if (!response.ok) throw new Error("Failed to fetch spell");

  return response.json();
}

export async function updateSpell(
  campaignId: string,
  spellId: string,
  data: Partial<Spell>
): Promise<Spell> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/${spellId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) throw new Error("Failed to update spell");

  return response.json();
}

export async function deleteSpell(
  campaignId: string,
  spellId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/${spellId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) throw new Error("Failed to delete spell");

  return response.json();
}

export async function deleteSpellsByLevel(
  campaignId: string,
  level: number
): Promise<{ success: boolean; deleted: number }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/spells/delete-by-level`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    }
  );

  if (!response.ok) throw new Error("Failed to delete spells by level");

  return response.json();
}
