"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SpellCastPayload, SpellDialogSpell } from "./types";

import type { SpellRichOptionData } from "@/components/spells/SpellRichOption";
import { getSpells } from "@/lib/api/spells";
import { participantSpellAllowsMultipleTargets } from "@/lib/utils/battle/spell/participant-spell-target-mode";
import type { BattleParticipant } from "@/types/battle";

function parseDiceType(diceType: string | null | undefined): number {
  if (!diceType) return 6;

  const match = diceType.match(/d(\d+)/);

  return match ? parseInt(match[1], 10) : 6;
}

export function useSpellDialog(
  campaignId: string,
  open: boolean,
  caster: BattleParticipant | null,
  onCast: (data: SpellCastPayload) => void,
  onPreview?: (data: SpellCastPayload) => void,
  allowAllSpells = false,
) {
  const [selectedSpellId, setSelectedSpellId] = useState("");

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const [savingThrows, setSavingThrows] = useState<
    Record<string, { roll: number; ability: string }>
  >({});

  const [damageRolls, setDamageRolls] = useState<string[]>([]);

  const [additionalRoll, setAdditionalRoll] = useState("");

  const [hitRoll, setHitRoll] = useState("");

  const [spells, setSpells] = useState<SpellDialogSpell[]>([]);

  const rollInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!caster || !open || !campaignId) return;

    const load = async () => {
      try {
        const all = (await getSpells(campaignId)) as SpellDialogSpell[];

        if (allowAllSpells) {
          setSpells(all);
        } else {
          const knownIds = caster.spellcasting.knownSpells ?? [];

          if (knownIds.length === 0) {
            setSpells([]);

            return;
          }

          setSpells(all.filter((s) => knownIds.includes(s.id)));
        }
      } catch (err) {
        console.error("Error loading spells:", err);
        setSpells([]);
      }
    };

    load();
  }, [caster, campaignId, open, allowAllSpells]);

  const spellsByGroup = useMemo(() => {
    const map = new Map<string, SpellRichOptionData[]>();

    spells.forEach((spell) => {
      const groupName = spell.spellGroup?.name ?? "Без групи";

      const list = map.get(groupName) ?? [];

      if (!map.has(groupName)) map.set(groupName, list);

      list.push(spell as SpellRichOptionData);
    });
    map.forEach((groupSpells) => {
      groupSpells.sort((a, b) =>
        a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name),
      );
    });

    return map;
  }, [spells]);

  const selectedSpell = useMemo(
    () => spells.find((s) => s.id === selectedSpellId) ?? null,
    [spells, selectedSpellId],
  );

  const diceTypeValue = selectedSpell
    ? parseDiceType(selectedSpell.diceType)
    : 6;

  const diceCount = selectedSpell?.diceCount ?? 1;

  /** Вибір цілей: одна / кілька / немає (no_target) */
  const spellTargetSelectionKind = useMemo((): "none" | "single" | "multi" => {
    if (!selectedSpell) return "none";

    if (selectedSpell.type === "no_target") return "none";

    if (selectedSpell.type === "aoe") return "multi";

    if (
      selectedSpell.type === "target" &&
      caster &&
      participantSpellAllowsMultipleTargets(caster, selectedSpell.id)
    ) {
      return "multi";
    }

    if (selectedSpell.type === "target") return "single";

    return "none";
  }, [selectedSpell, caster]);

  useEffect(() => {
    if (spellTargetSelectionKind !== "single") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- зрізати цілі при перемиканні на single-target
    setSelectedTargets((prev) =>
      prev.length <= 1 ? prev : [prev[0] as string],
    );
  }, [spellTargetSelectionKind, selectedSpellId]);

  const buildCastData = (): SpellCastPayload | null => {
    if (!caster || !selectedSpell) return null;

    const savingThrowsArray = Object.entries(savingThrows)
      .filter(([, data]) => data.roll > 0)
      .map(([participantId, data]) => ({ participantId, roll: data.roll }));

    const hitRollNum = hitRoll ? parseInt(hitRoll, 10) : undefined;

    return {
      casterId: caster.basicInfo.id,
      casterType: caster.basicInfo.sourceType,
      spellId: selectedSpellId,
      targetIds: selectedSpell.type === "no_target" ? [] : selectedTargets,
      damageRolls: damageRolls
        .map((r) => parseInt(r, 10))
        .filter((n) => !Number.isNaN(n)),
      savingThrows:
        savingThrowsArray.length > 0 ? savingThrowsArray : undefined,
      additionalRollResult: additionalRoll
        ? parseInt(additionalRoll, 10)
        : undefined,
      hitRoll:
        hitRollNum !== undefined && hitRollNum >= 1 && hitRollNum <= 20
          ? hitRollNum
          : undefined,
    };
  };

  const resetForm = () => {
    setSelectedSpellId("");
    setSelectedTargets([]);
    setSavingThrows({});
    setDamageRolls([]);
    setAdditionalRoll("");
    setHitRoll("");
  };

  const handleCast = () => {
    if (!selectedSpellId || !selectedSpell || !caster) return;

    if (spellTargetSelectionKind !== "none") {
      if (spellTargetSelectionKind === "single" && selectedTargets.length !== 1)
        return;

      if (
        spellTargetSelectionKind === "multi" &&
        selectedTargets.length === 0
      )
        return;
    }

    const data = buildCastData();

    if (!data) return;

    if (onPreview) {
      onPreview(data);

      return;
    }

    onCast(data);
    resetForm();
  };


  const handleTargetToggle = (targetId: string, checked: boolean) => {
    if (!selectedSpell) return;

    if (spellTargetSelectionKind === "single") {
      setSelectedTargets(checked ? [targetId] : []);
    } else if (spellTargetSelectionKind === "multi") {
      setSelectedTargets((prev) =>
        checked ? [...prev, targetId] : prev.filter((id) => id !== targetId),
      );
    }

    if (!checked) {
      setSavingThrows((prev) => {
        const next = { ...prev };

        delete next[targetId];

        return next;
      });
    }
  };

  const isSubmitDisabled =
    !selectedSpellId ||
    !selectedSpell ||
    (spellTargetSelectionKind === "single" &&
      selectedTargets.length !== 1) ||
    (spellTargetSelectionKind === "multi" &&
      selectedTargets.length === 0) ||
    (selectedSpell.hitCheck != null &&
      !(parseInt(hitRoll, 10) >= 1 && parseInt(hitRoll, 10) <= 20));

  const submitLabel = onPreview ? "Підрахувати шкоду" : "Застосувати заклинання";

  return {
    spells,
    spellsByGroup,
    selectedSpellId,
    setSelectedSpellId,
    selectedTargets,
    setSelectedTargets,
    savingThrows,
    setSavingThrows,
    damageRolls,
    setDamageRolls,
    additionalRoll,
    setAdditionalRoll,
    hitRoll,
    setHitRoll,
    selectedSpell,
    diceCount,
    diceTypeValue,
    rollInputRefs,
    setRollInputRef: (index: number, el: HTMLInputElement | null) => {
      rollInputRefs.current[index] = el;
    },
    buildCastData,
    handleCast,
    resetForm,
    handleTargetToggle,
    isSubmitDisabled,
    submitLabel,
    spellTargetSelectionKind,
  };
}
