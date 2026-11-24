'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';

import { ActionDock } from './dock/ActionDock';
import { ActionGrid } from './ActionGrid';
import { TurnCountdown } from './TurnCountdown';

import { modeUiOf } from '@/components/battle/modes';
import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';
import { useSystemBattleUi } from '@/components/battle/use-system-battle-ui';
import { AuraZonePicker } from '@/components/battle/wizards/AuraZonePicker';
import { ParticipantSourceType } from '@/lib/constants/battle';
import {
    useAttackWizard,
    useAuraZones,
    useBattleRules,
    useBattleScene,
    useBonusSpells,
    usePlayerTurn,
    useSpellBook,
} from '@/lib/hooks/battle';
import { coreActionsOn } from '@/lib/utils/battle/actions/access';
import { canOffHandAttack } from '@/lib/utils/battle/attack/off-hand';
import {
    canConsumeIntent,
    COUNTDOWN_SECONDS,
    turnAllowsAttack,
} from '@/lib/utils/battle/flows';
import {
    movementOf,
    reactionAvailable,
    usableAbilities,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

const AttackWizard = dynamic(
    () =>
        import('@/components/battle/wizards/AttackWizard').then(
            (m) => m.AttackWizard
        ),
    { ssr: false }
);

const SpellBook = dynamic(
    () =>
        import('@/components/battle/wizards/SpellBook').then(
            (m) => m.SpellBook
        ),
    { ssr: false }
);

const CoreActionsDialog = dynamic(
    () =>
        import('@/components/battle/turn/CoreActionsDialog').then(
            (m) => m.CoreActionsDialog
        ),
    { ssr: false }
);

const GearDialog = dynamic(
    () =>
        import('@/components/battle/turn/GearDialog').then((m) => m.GearDialog),
    { ssr: false }
);

const BonusActionPicker = dynamic(
    () =>
        import('@/components/battle/wizards/BonusActionPicker').then(
            (m) => m.BonusActionPicker
        ),
    { ssr: false }
);

/** dock: portals the action dock into the scene slot; the wizards stay owned here. */
export function MyTurnControls({
    hero,
    dock,
}: {
    hero: BattleParticipant;
    dock?: boolean;
}) {
    const { anyPending, battle, intents } = useBattleScene();

    const { actionEconomy, tested, spells } = useBattleRules();

    const {
        attack: attackIntent,
        clearAttack: clearAttackIntent,
        setAttackReady,
    } = intents;

    const turn = usePlayerTurn(hero, useBonusSpells(hero));

    const attack = useAttackWizard(hero, turn.actions.afterAction);

    const book = useSpellBook(hero, { onDone: turn.actions.afterAction });

    const [channelOpen, setChannelOpen] = useState(false);

    const systemUi = useSystemBattleUi();

    const zone = useAuraZones(hero);

    const [bonusOpen, setBonusOpen] = useState(false);

    const [abilityOpen, setAbilityOpen] = useState(false);

    const [coreOpen, setCoreOpen] = useState(false);

    const [gearOpen, setGearOpen] = useState(false);

    const [actionsOpen, setActionsOpen] = useState(false);

    const dockSlot = useSceneSlot('dock');

    const bonusAbilities = usableAbilities(
        hero,
        'bonusAction',
        battle.currentRound
    );

    const actionAbilities = usableAbilities(
        hero,
        'action',
        battle.currentRound
    );

    const hasGear =
        actionEconomy.bonusAction &&
        hero.basicInfo.sourceType === ParticipantSourceType.CHARACTER;

    const hasMagic =
        (!tested &&
            Object.values(hero.spellcasting?.spellSlots ?? {}).some(
                (s) => s.current > 0
            )) ||
        (hero.spellcasting?.knownSpells.length ?? 0) > 0;

    const {
        phase,
        status: { actionUsed, attackLeft, skipped },
    } = turn;

    const { open: openAttack } = attack.actions;

    const { currentRound: round, currentTurnIndex: turnIndex } = battle;

    const heroId = hero.basicInfo.id;

    const ui = modeUiOf(battle.map);

    const attackReady = turnAllowsAttack({
        phase,
        actionUsed,
        skipped,
        attackLeft,
    });

    useEffect(() => {
        setAttackReady(attackReady ? heroId : null);

        return () => setAttackReady(null);
    }, [attackReady, heroId, setAttackReady]);

    useEffect(() => {
        if (attackIntent === null) return;

        if (
            canConsumeIntent(attackIntent, {
                heroId,
                round,
                turnIndex,
                phase,
                actionUsed,
                skipped,
                attackLeft,
            })
        )
            openAttack(attackIntent.targetId, attackIntent.attackId);

        clearAttackIntent();
    }, [
        attackIntent,
        heroId,
        round,
        turnIndex,
        phase,
        actionUsed,
        attackLeft,
        skipped,
        openAttack,
        clearAttackIntent,
    ]);

    const run = (open: () => void) => {
        setActionsOpen(false);

        open();
    };

    const grid = (
        <ActionGrid
            turn={turn}
            channelLabel={systemUi.ChannelLabel && <systemUi.ChannelLabel />}
            gateLabel={
                systemUi.turnStart && (
                    <systemUi.turnStart.Label outcome={turn.gateResult} />
                )
            }
            pending={anyPending}
            available={{
                channel: !!systemUi.ChannelDialog && tested && hasMagic,
                magic: hasMagic,
                magicTile: spells,
                bonus:
                    bonusAbilities.length > 0 ||
                    canOffHandAttack(hero, battle.rules),
                bonusTile: actionEconomy.bonusAction,
                ability: actionAbilities.length > 0,
                core: coreActionsOn(battle.rules),
                gear: hasGear,
            }}
            actions={{
                channel: () => run(() => setChannelOpen(true)),
                attack: () => run(() => attack.actions.open()),
                magic: () => run(() => book.actions.open()),
                bonus: () => run(() => setBonusOpen(true)),
                ability: () => run(() => setAbilityOpen(true)),
                core: () => run(() => setCoreOpen(true)),
                gear: () => run(() => setGearOpen(true)),
            }}
        />
    );

    const gatePanel = turn.phase === 'gate' && systemUi.turnStart && (
        <systemUi.turnStart.Panel hero={hero} gate={turn.gate} />
    );

    const zonePicker = turn.phase === 'acting' && zone && (
        <div className="pt-3">
            <AuraZonePicker step={zone} />
        </div>
    );

    const modeControls = turn.phase === 'acting' && ui?.TurnControls && (
        <ui.TurnControls hero={hero} />
    );

    const countdown = turn.phase === 'countdown' && (
        <TurnCountdown
            seconds={COUNTDOWN_SECONDS}
            onElapsed={() => void turn.actions.endTurn()}
            onStay={turn.actions.stay}
        />
    );

    const full = (
        <>
            {gatePanel}
            {zonePicker}
            {(turn.phase === 'acting' || turn.phase === 'countdown') && grid}
            {modeControls}
        </>
    );

    const dockView = dockSlot
        ? createPortal(
              <ActionDock
                  status={{
                      actionUsed: actionUsed && !attackLeft,
                      bonusAvailable: turn.status.bonusAvailable,
                      reactionAvailable: reactionAvailable(hero),
                  }}
                  economy={actionEconomy}
                  move={
                      battle.map && !ui
                          ? movementOf(hero, battle.rules)
                          : undefined
                  }
                  phase={phase}
                  on={{
                      actions: () => setActionsOpen(true),
                      end: () => void turn.actions.endTurn(),
                  }}
                  panel={{
                      open: actionsOpen,
                      onOpenChange: setActionsOpen,
                      content: grid,
                  }}
              >
                  {gatePanel}
                  {zonePicker}
                  {modeControls}
                  {countdown}
              </ActionDock>,
              dockSlot
          )
        : null;

    return (
        <>
            {dock ? dockView : full}
            {!dock && countdown}
            <AttackWizard wizard={attack} />
            <SpellBook book={book} />
            {tested && systemUi.ChannelDialog && (
                <systemUi.ChannelDialog
                    hero={hero}
                    open={channelOpen}
                    onClose={() => setChannelOpen(false)}
                    onDone={turn.actions.afterAction}
                />
            )}
            {coreActionsOn(battle.rules) && (
                <CoreActionsDialog
                    participant={hero}
                    open={coreOpen}
                    onOpenChange={setCoreOpen}
                    onDone={turn.actions.afterAction}
                />
            )}
            {hasGear && (
                <GearDialog
                    participant={hero}
                    open={gearOpen}
                    onOpenChange={setGearOpen}
                    onDone={turn.actions.afterAction}
                />
            )}
            {actionEconomy.bonusAction && (
                <BonusActionPicker
                    participant={hero}
                    open={bonusOpen}
                    onOpenChange={setBonusOpen}
                    onDone={turn.actions.afterAction}
                    onOffHand={() =>
                        attack.actions.open(undefined, undefined, {
                            offHand: true,
                        })
                    }
                />
            )}
            <BonusActionPicker
                participant={hero}
                trigger="action"
                open={abilityOpen}
                onOpenChange={setAbilityOpen}
                onDone={turn.actions.afterAction}
            />
        </>
    );
}
