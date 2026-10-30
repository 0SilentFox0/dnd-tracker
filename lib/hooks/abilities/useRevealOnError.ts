import { useState } from "react";

/** Calls `reveal` during render whenever the non-empty error key changes (state-derived, no effect). */
export function useRevealOnError(errorKey: string, reveal: (errorKey: string) => void) {
  const [seen, setSeen] = useState("");

  if (errorKey !== seen) {
    setSeen(errorKey);

    if (errorKey) reveal(errorKey);
  }
}
