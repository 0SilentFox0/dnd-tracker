'use client';

import { useTranslations } from 'next-intl';

import type {
    RerollTokenControlProps,
    RerollTokenDmProps,
} from '@/components/systems/types';
import { Switch } from '@/components/ui/switch';
import { SwitchField } from '@/components/ui/switch-field';
import { useInspiration } from '@/systems/inspiration/hooks';

export function InspirationDmToggle({
    campaignId,
    characterId,
    value,
}: RerollTokenDmProps) {
    const t = useTranslations('inspiration');

    const inspiration = useInspiration(campaignId, characterId);

    return (
        <SwitchField
            id="dm-inspiration"
            label={t('dm')}
            checked={value}
            disabled={inspiration.isPending}
            onCheckedChange={(v) => void inspiration.mutateOk(v)}
        />
    );
}

export function InspirationCardMark() {
    const t = useTranslations('inspiration');

    return (
        <span title={t('card')} className="text-hud-gold">
            ✦
        </span>
    );
}

export function InspirationAttackOption({
    checked,
    onChange,
}: RerollTokenControlProps) {
    const t = useTranslations('inspiration');

    return (
        <label className="mt-2 flex items-center gap-2 text-sm text-hud-gold">
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                aria-label={t('label')}
            />
            {t('attackNote')}
        </label>
    );
}

export function InspirationSheetOption({
    checked,
    onChange,
}: RerollTokenControlProps) {
    const t = useTranslations('inspiration');

    return (
        <SwitchField
            id="sheet-roll-inspiration"
            ariaLabel={t('label')}
            label={t('sheetRoll')}
            checked={checked}
            onCheckedChange={onChange}
        />
    );
}
