"use client";

import { useEffect, useState } from "react";

const FLASH_DURATION_MS = 2000;

/**
 * Відстежує зміну HP і повертає дані для показу анімації урону/лікування.
 * Використовується в ParticipantCard для flash-ефекту при зміні currentHp.
 */
export function useDamageFlash(currentHp: number) {
  const [lastHp, setLastHp] = useState(currentHp);

  const [showDamage, setShowDamage] = useState(false);

  const [damageAmount, setDamageAmount] = useState(0);

  useEffect(() => {
    if (currentHp === lastHp) return;

    const diff = currentHp - lastHp;

    const id = setTimeout(() => {
      setShowDamage(false);
    }, FLASH_DURATION_MS);

    queueMicrotask(() => {
      setLastHp(currentHp);
      setDamageAmount(diff);
      setShowDamage(true);
    });

    return () => clearTimeout(id);
  }, [currentHp, lastHp]);

  return { lastHp, showDamage, damageAmount };
}
