'use client';

import { useProfile } from '@/components/character-profile/ProfileContext';
import type { RollDialogBodyProps } from '@/components/systems/types';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import type { HitLocation } from '@/systems/wfrp/rules/combat/constants';
import { editionOf } from '@/systems/wfrp/rules/edition';
import type { FortuneKind } from '@/systems/wfrp/rules/percentile/fortune';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';
import type { SheetFortuneKind } from '@/types/characters';

type FortuneChoice = FortuneKind | null;

const TO_CHOICE: Record<SheetFortuneKind, FortuneChoice> = {
    advantage: 'sl',
    reroll: 'reroll',
    notFail: 'notFail',
};

const FROM_CHOICE = {
    sl: 'advantage',
    reroll: 'reroll',
    notFail: 'notFail',
} as const;

export interface SheetFortune {
    left: number;
    fateLeft?: number;
    value: FortuneChoice;
    onChange(value: FortuneChoice): void;
    advantageLabel: boolean;
    rerolls?: { value: number; set(n: number): void };
    notFail?: {
        critical: boolean;
        location?: HitLocation;
        set(critical: boolean, location?: HitLocation): void;
    };
}

/** Null when the hero has nothing to spend. */
export function useSheetFortune({
    extra,
    setExtra,
}: Pick<RollDialogBodyProps, 'extra' | 'setExtra'>): SheetFortune | null {
    const { campaignId, sheet } = useProfile();

    const rules = useCampaignRules(campaignId).data;

    const block = SHEET_SLOT.read(sheet.systemSlot);

    if (!block) return null;

    const canon = editionOf(rules).fortunePools === 'split';

    const left = block.fortune ?? 0;

    const fateLeft = canon ? (block.fateLeft ?? block.fate) : undefined;

    if (left < 1 && (fateLeft ?? 0) < 1) return null;

    const kind = extra.fortune;

    return {
        left,
        fateLeft,
        value: kind ? TO_CHOICE[kind] : null,
        onChange: (value) =>
            setExtra(value ? { fortune: FROM_CHOICE[value] } : {}),
        advantageLabel: editionOf(rules).advantageModel === 'reverse',
        ...(canon && {
            rerolls: {
                value: extra.rerolls ?? 1,
                set: (n) => setExtra({ ...extra, rerolls: n }),
            },
            notFail: {
                critical: extra.critical === true,
                location: extra.location as HitLocation | undefined,
                set: (critical, location) =>
                    setExtra({
                        fortune: 'notFail',
                        ...(critical && {
                            critical,
                            ...(location && { location }),
                        }),
                    }),
            },
        }),
    };
}
