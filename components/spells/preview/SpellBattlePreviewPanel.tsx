'use client';

import { type ReactNode, useMemo } from 'react';
import { Play } from 'lucide-react';

import '@/components/battle/fx/fx.css';
import { PreviewUnitRow } from '@/components/battle/fx/preview/PreviewUnitRow';
import { PALETTE } from '@/components/battle/fx/runtime/palette';
import { playFx } from '@/components/battle/fx/runtime/play';
import { cancelLayer } from '@/components/battle/fx/runtime/stage';
import { useFxBadgeLabels } from '@/components/battle/fx/use-badge-labels';
import {
    type FxRunner,
    useFxEnabled,
    useSpellFxPlayback,
} from '@/lib/hooks/battle';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import {
    PREVIEW_UNITS,
    type PreviewSpell,
    type PreviewUnit,
} from '@/lib/utils/battle/fx';
import { castableOf, previewCastFx } from '@/lib/utils/battle/fx/spell-preview';

// a preview has no queue to hold up, so it waits for the signature however long its chunk takes
const [CASTER] = PREVIEW_UNITS;

function Chip({
    label,
    book,
    children,
}: {
    label: string;
    book: boolean;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4',
                book
                    ? 'spell-book-preview-pill'
                    : 'border-hud-line bg-hud-raised'
            )}
        >
            <span className={book ? 'spell-book-muted' : 'text-hud-muted'}>
                {label}
            </span>
            {children}
        </span>
    );
}

export default function SpellBattlePreviewPanel({
    spell,
    className,
    variant = 'hud',
}: {
    spell: PreviewSpell;
    className?: string;
    variant?: 'hud' | 'book';
}) {
    const t = useTranslator('spells');

    const labels = useFxBadgeLabels();

    const runner = useMemo<FxRunner>(
        () => ({
            play: (layer, spec, root) =>
                playFx(layer, spec, root, Infinity, undefined, labels),
            cancel: cancelLayer,
        }),
        [labels]
    );

    const book = variant === 'book';

    const { id, name, level, groupId, fx: spellFx, rules } = spell;

    const preview = useMemo(
        () =>
            previewCastFx(
                castableOf({ id, name, level, groupId, fx: spellFx, rules })
            ),
        [id, name, level, groupId, spellFx, rules]
    );

    const fx = useFxEnabled();

    const { spec, targets, targetIds, auras } = preview;

    const { arenaRef, layerRef, hit, settled, replay } = useSpellFxPlayback(
        spec,
        fx.enabled,
        runner
    );

    if (!spec && auras.length === 0) return null;

    const others = PREVIEW_UNITS.filter(
        (u) => u.id !== CASTER.id && targetIds.includes(u.id)
    );

    const row = (unit: PreviewUnit) => (
        <PreviewUnitRow
            key={unit.id}
            unit={unit}
            target={targets.find((t) => t.id === unit.id)}
            hit={hit}
            aurasOn={settled}
            look={{ compact: true, book, still: !fx.motionAllowed }}
        />
    );

    return (
        <section
            aria-label={t('fx.aria')}
            className={cn(
                'fx-preview text-[13px] not-italic',
                book
                    ? 'spell-book-preview'
                    : 'rounded-xl border border-hud-line bg-hud-page/95 p-2.5 text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)]',
                className
            )}
        >
            {fx.userEnabled && (
                <div
                    className={cn(
                        book &&
                            'spell-book-border mb-2 rounded-[2px] border p-[3px]'
                    )}
                >
                    <div
                        ref={arenaRef}
                        data-testid="spell-preview-arena"
                        className={cn(
                            'relative grid gap-x-6 py-3',
                            book
                                ? 'px-7 py-5 outline outline-1 -outline-offset-[1px] outline-[color-mix(in_srgb,var(--book-accent,#7a2a1f)_50%,transparent)]'
                                : 'mb-2',
                            others.length
                                ? 'grid-cols-2'
                                : 'grid-cols-1 justify-items-center'
                        )}
                        style={
                            book
                                ? {
                                      background:
                                          'radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--book-accent) 24%, var(--book-page)) 0%, var(--book-page) 72%)',
                                      boxShadow:
                                          'inset 0 0 22px 6px color-mix(in srgb, var(--book-ink) 15%, transparent)',
                                  }
                                : undefined
                        }
                    >
                        <div className="w-full max-w-[220px] self-center">
                            {row(CASTER)}
                        </div>
                        {others.length > 0 && (
                            <div className="space-y-1.5">{others.map(row)}</div>
                        )}
                        <div ref={layerRef} className="fx-layer" />
                    </div>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
                {spec && (
                    <>
                        <Chip book={book} label={t('fx.animation')}>
                            {t(`fx.archetypes.${spec.archetype}`)}
                        </Chip>
                        <Chip book={book} label={t('fx.element')}>
                            <span
                                aria-hidden
                                className="size-2 rounded-full"
                                style={{
                                    background: PALETTE[spec.element].core,
                                }}
                            />
                            {t(`fx.elements.${spec.element}`)}
                        </Chip>
                    </>
                )}
                {auras.length > 0 && (
                    <Chip book={book} label={t('fx.aura')}>
                        {auras.map((a) => t(`fx.auras.${a}`)).join(', ')}
                    </Chip>
                )}
                {fx.enabled && spec && (
                    <button
                        type="button"
                        onClick={replay}
                        className={cn(
                            'ml-auto inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[11px]',
                            book
                                ? 'spell-book-preview-title shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--book-accent)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--book-accent)_10%,transparent)]'
                                : 'text-hud-gold-bright shadow-[inset_0_0_0_1px_var(--color-hud-edge)] hover:bg-hud-raised'
                        )}
                    >
                        <Play className="size-3" aria-hidden />
                        {t('fx.replay')}
                    </button>
                )}
            </div>
        </section>
    );
}
