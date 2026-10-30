
import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { CharacterGate } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { mergeBackground } from "@/lib/utils/backgrounds/selection";
import { choicesStateOf, withClassPicks, withClassSubclasses } from "@/lib/utils/characters/choices/picks";
import { validateClassEntries } from "@/lib/utils/characters/classes/application";
import type { ChoicesBody } from "@/types/choices";

export async function saveCharacterChoices({ access, character }: CharacterGate, body: ChoicesBody) {
  if (!access.isDM && !access.campaign.allowPlayerEdit) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  if (!access.isDM && character.status === CharacterStatus.PENDING) throw new ContentError(API_ERRORS.DRAFT_EDIT_VIA_DRAFT, 403);

  await assertNotInActiveBattle(character.campaignId, [character.id]);

  const { rules } = access.campaign;

  return prisma.$transaction(async (tx) => {
    await lockCharacters(tx, [character.id]);

    const row = await tx.character.findUnique({ where: { id: character.id } });

    if (!row) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const before = choicesStateOf(row);

    const refs = await loadChoiceRefs(row.campaignId, row.race, { classMode: characterClassMode(rules, before.classes), backgroundIds: [before.backgroundId, body.backgroundId], db: tx });

    let classes = body.classChoices ? withClassPicks(before.classes, body.classChoices) : before.classes;

    if (body.classSubclasses) {
      const subclassed = withClassSubclasses(classes, body.classSubclasses);

      if (subclassed.conflict) throw new ContentError(API_ERRORS.SUBCLASS_ALREADY_SET, 422);

      const invalid = validateClassEntries(subclassed.entries, refs.classesById, access.campaign.maxLevel);

      if (invalid) throw new ContentError(invalid.error, 422, undefined, invalid.params);

      classes = subclassed.entries;
    }

    const after = { ...mergeBackground(before, body), raceChoices: body.raceChoices ?? before.raceChoices, feats: body.feats ?? before.feats, classes };

    const resolved = await resolveCharacterChoices({ campaignId: row.campaignId, rules, isDM: access.isDM, character: row, before, after, refs });

    if (!resolved.ok) throw resolved.error;

    const updated = await tx.character.update({ where: { id: row.id }, data: resolved.fields, include: { user: { select: PUBLIC_USER_SELECT }, inventory: true }, omit: { notes: true } });

    const scores = Object.fromEntries(ABILITY_KEYS.flatMap((k) => (typeof resolved.fields[k] === "number" ? [[k, resolved.fields[k]]] : [])));

    await writeCharacterLog(tx, [{ campaignId: row.campaignId, characterId: row.id, actorUserId: access.userId, kind: CharacterLogKind.CHOICES_EDIT, data: { before, after: resolved.state, scores } }]);

    return updated;
  });
}
