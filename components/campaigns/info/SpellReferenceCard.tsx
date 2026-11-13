'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Sparkles } from 'lucide-react';

import { useAbilityText } from '@/lib/hooks/abilities';
import { EntityIcon } from '@/components/common/EntityIcon';
import { SpellBattlePreview } from '@/components/spells/preview/SpellBattlePreview';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateSpellAppearance } from '@/lib/hooks/spells';
import { useText } from '@/lib/i18n/use-text';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    formatMechanicsSpell,
    getShortSpellSummary,
} from '@/lib/utils/campaigns/info-reference';
import type { SpellForReference } from '@/types/info-reference';

interface SpellReferenceCardProps {
    campaignId: string;
    spell: SpellForReference;
    isDM: boolean;
}

export function SpellReferenceCard({
    campaignId,
    spell,
    isDM,
}: SpellReferenceCardProps) {
    const {
        draft: { data: appearance, set: setAppearance },
        status: { isSaving: saving },
        save,
    } = useUpdateSpellAppearance(
        campaignId,
        spell.id,
        spell.appearanceDescription ?? ''
    );

    const t = useTranslations('dashboard.reference.card');

    const text = useText();

    const translate = useTranslator();

    const effects = useAbilityText().lines(spell.effects);

    const shortSummary = getShortSpellSummary(spell, translate);

    return (
        <AccordionItem
            value={spell.id}
            className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] last:border-b"
        >
            <AccordionTrigger className="flex items-center gap-3 p-0 hover:no-underline [&[data-state=open]>div]:border-b">
                <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left [font-family:var(--font-hud-sans)] tracking-normal">
                    <EntityIcon
                        src={spell.icon}
                        name={spell.name}
                        size={40}
                        className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                        fallback={<Sparkles className="size-5" />}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="hud-sc block text-sm leading-tight text-hud-ink">
                            {spell.name}
                        </span>
                        <span className="text-xs text-hud-muted">
                            {t('levelShort', { level: spell.level })}
                            {spell.groupName ? ` · ${spell.groupName}` : ''}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
                            {appearance.trim() ? appearance : shortSummary}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-3 border-t border-hud-line px-3 pt-2 pb-3 text-hud-bone">
                    <div>
                        <Label className="hud-sc text-xs text-hud-gold">
                            {t('mechanics')}
                        </Label>
                        <p className="mt-0.5 text-sm">
                            {formatMechanicsSpell(spell, translate)}
                        </p>
                    </div>
                    {spell.description && (
                        <div>
                            <Label className="hud-sc text-xs text-hud-gold">
                                {t('description')}
                            </Label>
                            <p className="mt-0.5 text-sm">
                                {spell.description}
                            </p>
                        </div>
                    )}
                    {spell.effects.length > 0 && (
                        <div>
                            <Label className="hud-sc text-xs text-hud-gold">
                                {t('effects')}
                            </Label>
                            <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-sm">
                                {effects.map((e, i) => (
                                    <li key={i}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div>
                        <Label className="hud-sc text-xs text-hud-gold">
                            {t('appearanceSpell')}
                        </Label>
                        {isDM ? (
                            <div className="mt-1 space-y-2">
                                <Textarea
                                    value={appearance}
                                    onChange={(e) =>
                                        setAppearance(e.target.value)
                                    }
                                    placeholder={t(
                                        'appearancePlaceholderSpell'
                                    )}
                                    rows={3}
                                    className="min-h-[80px] text-sm"
                                />
                                <Button
                                    size="sm"
                                    disabled={saving}
                                    onClick={save}
                                    className="min-h-9 touch-manipulation"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        t('saveAppearance')
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <p className="mt-0.5 text-sm">
                                {spell.appearanceDescription || '—'}
                            </p>
                        )}
                    </div>
                    {spell.rules && (
                        <SpellBattlePreview
                            spell={{
                                id: spell.id,
                                name: spell.name,
                                level: spell.level,
                                groupId: null,
                                fx: spell.fx,
                                rules: spell.rules,
                            }}
                        />
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
