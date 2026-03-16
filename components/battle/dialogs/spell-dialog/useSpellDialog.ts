"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SpellCastPayload, SpellDialogSpell } from "./types";

import type { SpellRichOptionData } from "@/components/spells/SpellRichOption";
import type { BattleParticipant } from "@/types/battle";

const SPELLS_API = (campaignId: string) =>
  `/api/campaigns/${campaignId}/spells`;

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
        const res = await fetch(SPELLS_API(campaignId));

        if (!res.ok) {
          setSpells([]);

          return;
        }

        const all: SpellDialogSpell[] = await res.json();

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

    if (selectedSpell.type !== "no_target") {
      if (selectedSpell.type === "target" && selectedTargets.length !== 1)
        return;

      if (selectedTargets.length === 0) return;
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

    if (selectedSpell.type === "target") {
      setSelectedTargets(checked ? [targetId] : []);
    } else if (selectedSpell.type === "aoe") {
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
    (selectedSpell.type !== "no_target" &&
      (selectedSpell.type === "target"
        ? selectedTargets.length !== 1
        : selectedTargets.length === 0)) ||
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
  };
}
