import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';

export type ParticipantSourceRef = { id: string; type: string };

export async function assertParticipantSources(
    campaignId: string,
    refs: readonly ParticipantSourceRef[],
    known: ReadonlySet<string> = new Set()
): Promise<void> {
    const checked = refs.filter((ref) => !known.has(String(ref.id)));

    const byType = { character: new Set<string>(), unit: new Set<string>() };

    for (const ref of checked)
        (ref.type === 'character' ? byType.character : byType.unit).add(
            String(ref.id)
        );

    const [characters, units] = await Promise.all([
        byType.character.size
            ? prisma.character.findMany({
                  where: { id: { in: [...byType.character] }, campaignId },
                  select: { id: true },
              })
            : [],
        byType.unit.size
            ? prisma.unit.findMany({
                  where: { id: { in: [...byType.unit] }, campaignId },
                  select: { id: true },
              })
            : [],
    ]);

    const found = {
        character: new Set(characters.map((row) => row.id)),
        unit: new Set(units.map((row) => row.id)),
    };

    for (const ref of checked)
        if (
            !(ref.type === 'character' ? found.character : found.unit).has(
                String(ref.id)
            )
        )
            throw new ContentError(
                API_ERRORS.BATTLE_PARTICIPANT_SOURCE_MISSING,
                404
            );
}

export function sourceIdsOf(participants: unknown): Set<string> {
    return new Set(
        Array.isArray(participants)
            ? participants.map((p) => String((p as { id?: unknown })?.id))
            : []
    );
}
