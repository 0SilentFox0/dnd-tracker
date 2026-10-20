"use client";

import { useCallback, useState } from "react";

/** Error count reported by AbilityListEditor; `onValidityChange` is stable for its effect deps. */
export function useAbilityValidity() {
  const [errors, setErrors] = useState(0);

  const onValidityChange = useCallback((_ok: boolean, count: number) => setErrors(count), []);

  return { errors, setErrors, valid: errors === 0, onValidityChange };
}

export type AbilityValidity = ReturnType<typeof useAbilityValidity>;
