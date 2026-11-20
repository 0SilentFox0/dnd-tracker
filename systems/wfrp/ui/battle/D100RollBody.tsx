import { useTranslations } from 'next-intl';

import { isHelpless } from '../../rules/combat/attack-mods/helpless';
import { fateLeftOf } from '../../rules/combat/fate';
import { heldBy } from '../../rules/combat/momentum';
import { editionOf } from '../../rules/edition';
import { SCENE_SLOT } from '../../rules/slots';
import { wfrpState } from '../../rules/state';
import { attackModsControls } from './attack-mods-controls';
import { AttackModsPicker } from './AttackModsPicker';
import { D100RollPicker } from './D100RollPicker';
import { fortuneControls } from './fortune-controls';

import { btn } from '@/components/battle/wizards/attack/shared';
import { HudButton } from '@/components/hud';
import type { RollBodyProps } from '@/components/systems/types';
import { useText } from '@/lib/i18n/use-text';
import { cn } from '@/lib/utils';
import { lockedRollSource } from '@/lib/utils/battle/flows/attack-flow';

export function D100RollBody({
    wizard: { state, view, actions },
}: RollBodyProps) {
    const t = useTranslations('battleWizards.attack.roll.d100');

    const tc = useTranslations('common.actions');

    const text = useText();

    const { judged, attacker } = view;

    const left = (attacker && wfrpState(attacker).fortune) ?? 0;

    const fateLeft = attacker ? fateLeftOf(attacker) : 0;

    const modsControls = attackModsControls(state.system, (slot) =>
        actions.setSystemInput(slot ?? null)
    );

    const strikeTarget =
        state.targetIds.length === 1
            ? view.targets.find((p) => p.basicInfo.id === state.targetIds[0])
            : undefined;

    const momentum =
        judged.attackerSide !== undefined &&
        heldBy(SCENE_SLOT.read(judged.sceneState) ?? {}, judged.attackerSide);

    return (
        <>
            {judged.target && (
                <div className="mt-2 text-sm text-hud-gold">
                    {t('target', {
                        target: judged.target.target,
                        label: text(judged.target.label),
                    })}
                </div>
            )}
            {state.diceSlots.length > 0 && (
                <div className="mt-1 text-sm text-[var(--hud-muted)]">
                    {t('damageDice', {
                        dice: state.diceSlots
                            .map((sides) => `d${sides}`)
                            .join(' + '),
                    })}
                </div>
            )}
            <div className="mt-1 text-sm text-[var(--hud-muted)]">
                {momentum
                    ? t('momentum.held', { side: t('momentum.side') })
                    : t('momentum.none')}
            </div>
            {editionOf(view.rules).combatModsModel === 'canon' && (
                <AttackModsPicker
                    {...modsControls}
                    kind={view.attackKind}
                    helpless={!!strikeTarget && isHelpless(strikeTarget)}
                />
            )}
            <D100RollPicker
                locked={lockedRollSource(state)}
                fortune={{
                    available:
                        (left >= 1 || fateLeft >= 1) &&
                        state.targetIds.length === 1 &&
                        state.index === 0,
                    left,
                    fateLeft,
                    ...fortuneControls(state.system, view.rules, (slot) =>
                        actions.setSystemInput(slot ?? null)
                    ),
                }}
                onRoll={actions.roll}
                onAuto={actions.aiRoll}
            />
            <HudButton
                type="button"
                onClick={actions.back}
                className={cn(btn, 'mt-3 w-full border-white/25')}
            >
                {tc('back')}
            </HudButton>
        </>
    );
}
