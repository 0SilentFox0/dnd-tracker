import { useTranslations } from 'next-intl';
import { Crosshair, Swords } from 'lucide-react';

import type { AttackWizardModel } from './shared';

import { AttackType } from '@/lib/constants/battle';
import { useText } from '@/lib/i18n/use-text';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';

export function WeaponStep({
    wizard: { state, view, actions },
}: {
    wizard: AttackWizardModel;
}) {
    const t = useTranslations('battleWizards.attack.weapon');

    const text = useText();

    const ta = useTranslations('battleWizards.attack.weapon.ammo');

    return (
        <div className="space-y-2">
            {view.attacks.map((a) => {
                const id = a.id ?? a.name;

                const preview = view.previews[id];

                const ammo = view.ammo[id];

                const locked = !!ammo && ammo.status !== 'ok';

                return (
                    <button
                        key={id}
                        type="button"
                        disabled={locked}
                        onClick={() => actions.selectWeapon(a)}
                        className={cn(
                            'flex h-[76px] w-full items-center gap-3 border px-3 text-left disabled:opacity-50',
                            id === state.attackId
                                ? 'border-[var(--enemy)] bg-[var(--enemy)]/15'
                                : 'border-white/15'
                        )}
                    >
                        {a.type === AttackType.RANGED ? (
                            <Crosshair className="size-7 shrink-0 text-[var(--gold)]" />
                        ) : (
                            <Swords className="size-7 shrink-0 text-[var(--gold)]" />
                        )}
                        <span className="min-w-0 flex-1">
                            <span className="hud-sc block text-[17px] font-bold">
                                {a.name}
                            </span>
                            <span className="block text-[13px] text-hud-soft">
                                {t(
                                    view.serverJudged
                                        ? 'toHitPercent'
                                        : 'toHit',
                                    {
                                        kind: t(
                                            a.type === AttackType.MELEE
                                                ? 'melee'
                                                : 'ranged'
                                        ),
                                        bonus: signed(
                                            preview?.toHit ?? a.attackBonus
                                        ),
                                        target:
                                            view.judged.weaponTargets[id] ?? 0,
                                    }
                                )}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-x-2.5 text-xs text-hud-gold">
                                {ammo && (
                                    <span>
                                        {locked
                                            ? ta(ammo.status)
                                            : ta('badge', {
                                                  left: ammo.left,
                                                  capacity: ammo.capacity,
                                              })}
                                    </span>
                                )}
                                {preview?.bonuses.map((b) => {
                                    const label = text(b.label);

                                    return (
                                        <span key={label}>
                                            {label}{' '}
                                            {b.percent
                                                ? `${signed(b.percent)}%`
                                                : signed(b.flat)}
                                        </span>
                                    );
                                })}
                            </span>
                        </span>
                        <span className="w-[72px] text-right text-[15px]">
                            {preview?.formula ||
                                a.damageDice ||
                                (a.damageBonus !== undefined
                                    ? String(a.damageBonus)
                                    : '')}
                            <small className="block text-xs text-[var(--hud-muted)]">
                                ≈ {preview?.estimate}
                            </small>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
