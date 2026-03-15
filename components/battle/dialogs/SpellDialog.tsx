"use client";

import type { SpellDialogProps } from "@/components/battle/dialogs/spell-dialog";
import {
  SpellHitCheckSection,
  SpellRollInputsSection,
  SpellSavingThrowsSection,
  SpellSlotsSection,
  SpellTargetsSection,
  useSpellDialog,
} from "@/components/battle/dialogs/spell-dialog";
import { SpellSelectDropdown } from "@/components/spells/SpellSelectDropdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type { SpellTargetType } from "@/components/battle/dialogs/spell-dialog";

export function SpellDialog({
  open,
  onOpenChange,
  caster,
  battle,
  campaignId,
  availableTargets,
  isDM,
  canSeeEnemyHp,
  onCast,
  onPreview,
}: SpellDialogProps) {
  const {
    spellsByGroup,
    selectedSpellId,
    setSelectedSpellId,
    selectedTargets,
    setSelectedTargets,
    savingThrows,
    setSavingThrows,
    damageRolls,
    setDamageRolls,
    hitRoll,
    setHitRoll,
    selectedSpell,
    diceCount,
    diceTypeValue,
    rollInputRefs,
    setRollInputRef,
    handleCast,
    resetForm,
    handleTargetToggle,
    isSubmitDisabled,
    submitLabel,
  } = useSpellDialog(campaignId, open, caster, onCast, onPreview);

  if (!caster || !battle) {
    return null;
  }

  const spellSlots = caster.spellcasting.spellSlots ?? {};

  const universalSlot = spellSlots.universal;

  const isUnit = caster.basicInfo.sourceType === "unit";

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();

    onOpenChange(nextOpen);
  };

  const handleRollChange = (index: number, value: string) => {
    const next = [...damageRolls];

    next[index] = value;
    setDamageRolls(next);
  };

  const handleRollKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const next = rollInputRefs.current[index + 1];

    if (next) next.focus();
    else handleCast();
  };

  const handleSavingThrowChange = (
    targetId: string,
    roll: number,
    ability: string,
  ) => {
    setSavingThrows((prev) => ({
      ...prev,
      [targetId]: { ability, roll },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="fixed bottom-[10px] left-1/2 top-auto w-[calc(100vw-20px)] max-w-md -translate-x-1/2 translate-y-0 max-h-[calc(100vh-20px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ Заклинання</DialogTitle>
          <DialogDescription>
            {caster.basicInfo.name} кастує заклинання
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <SpellSlotsSection spellSlots={spellSlots} />

          <div>
            <Label>Заклинання</Label>
            <SpellSelectDropdown
              groupedSpells={spellsByGroup}
              value={selectedSpellId}
              onValueChange={(nextId, spell) => {
                setSelectedSpellId(nextId);

                if (spell?.type === "no_target") setSelectedTargets([]);
              }}
              getIsDisabled={(spell) => {
                const slot = spellSlots[spell.level.toString()];

                return !(isUnit
                  ? (universalSlot?.current ?? 0) > 0
                  : Boolean(slot?.current && slot.current > 0));
              }}
              getSlotLabel={(spell) => {
                const slot = isUnit
                  ? universalSlot
                  : spellSlots[spell.level.toString()];

                if (!slot) return undefined;

                return `${slot.current}/${slot.max}`;
              }}
              placeholder="Оберіть заклинання"
            />
          </div>

          {selectedSpell && (
            <SpellTargetsSection
              selectedSpell={selectedSpell}
              selectedTargets={selectedTargets}
              availableTargets={availableTargets}
              isDM={isDM}
              canSeeEnemyHp={canSeeEnemyHp}
              onTargetToggle={handleTargetToggle}
            />
          )}

          {selectedSpell &&
            selectedSpell.damageType !== "heal" &&
            diceCount > 0 && (
              <SpellRollInputsSection
                label="Кубики урону"
                diceCount={diceCount}
                diceTypeLabel={selectedSpell.diceType ?? "d6"}
                diceTypeValue={diceTypeValue}
                values={damageRolls}
                onChange={handleRollChange}
                onKeyDown={handleRollKeyDown}
                inputRef={setRollInputRef}
                onSubmit={handleCast}
              />
            )}

          {selectedSpell &&
            selectedSpell.damageType === "heal" &&
            diceCount > 0 && (
              <SpellRollInputsSection
                label="Кубики лікування"
                diceCount={diceCount}
                diceTypeLabel={selectedSpell.diceType ?? "d6"}
                diceTypeValue={diceTypeValue}
                values={damageRolls}
                onChange={handleRollChange}
                onKeyDown={handleRollKeyDown}
                inputRef={setRollInputRef}
                onSubmit={handleCast}
              />
            )}

          {selectedSpell?.hitCheck && (
            <SpellHitCheckSection
              ability={selectedSpell.hitCheck.ability}
              dc={selectedSpell.hitCheck.dc}
              value={hitRoll}
              onChange={setHitRoll}
            />
          )}

          {selectedTargets.length > 0 && selectedSpell?.savingThrow && (
            <SpellSavingThrowsSection
              selectedTargetIds={selectedTargets}
              availableTargets={availableTargets}
              ability={selectedSpell.savingThrow.ability}
              values={savingThrows}
              onChange={handleSavingThrowChange}
            />
          )}

          <Button
            onClick={handleCast}
            disabled={isSubmitDisabled}
            className="w-full"
          >
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
