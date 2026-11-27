import { useTranslations } from 'next-intl';

import type { MoneyMode } from '../stash/MoneyDialog';

import { HudButton } from '@/components/hud';
import { type Coin,COINS } from '@/lib/constants/inventory';
import type { InventoryModel } from '@/lib/hooks/characters';
import type { CurrencyView } from '@/lib/hooks/systems';
import type { Purse } from '@/types/inventory';

const COIN_DOT: Record<Coin, string> = {
    gp: 'bg-amber-400 border-amber-600',
    sp: 'bg-slate-300 border-slate-500',
    cp: 'bg-orange-600 border-orange-800',
};

const BUTTONS: { mode: MoneyMode; sign: string; dmOnly?: boolean }[] = [
    { mode: 'spend', sign: '−' },
    { mode: 'gain', sign: '+' },
    { mode: 'set', sign: '=', dmOnly: true },
];

export function PurseBar({
    purse,
    access,
    onMode,
    currency,
}: {
    purse: Purse;
    access: InventoryModel['access'];
    onMode: (m: MoneyMode) => void;
    currency?: CurrencyView;
}) {
    const t = useTranslations('inventory');

    return (
        <div className="flex items-center justify-between gap-2 rounded-md border border-hud-rule bg-hud-field px-3 py-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <span className="text-sm text-hud-ink">
                {COINS.map((c) => (
                    <span key={c} className="mr-3 whitespace-nowrap last:mr-0">
                        <span
                            aria-hidden
                            className={`mr-1 inline-block size-3 rounded-full border align-middle ${COIN_DOT[c]}`}
                        />
                        {purse[c]}{' '}
                        <span className="text-xs text-hud-muted">
                            {currency ? currency.label(c) : t(`coins.${c}`)}
                        </span>
                    </span>
                ))}
            </span>
            {access.canAct && (
                <span className="flex gap-1">
                    {BUTTONS.filter((b) => !b.dmOnly || access.isDM).map(
                        (b) => (
                            <HudButton
                                key={b.mode}
                                type="button"
                                aria-label={t(`purse.${b.mode}`)}
                                title={t(`purse.${b.mode}`)}
                                onClick={() => onMode(b.mode)}
                                className="inline-flex min-h-9 items-center gap-1 rounded border border-hud-line px-2 text-xs text-hud-ink hover:border-hud-muted"
                            >
                                {b.sign}
                                <span className="max-sm:sr-only">
                                    {t(`purse.${b.mode}`)}
                                </span>
                            </HudButton>
                        )
                    )}
                </span>
            )}
        </div>
    );
}
