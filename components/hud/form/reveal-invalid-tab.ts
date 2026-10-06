import { type SyntheticEvent, useRef } from "react";

const invalidControls = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLInputElement>("input, textarea, select")).filter((el) => el.willValidate && !el.validity.valid);

const tabOf = (el: Element) => el.closest<HTMLElement>("[data-tab-id]")?.dataset.tabId;

export function findInvalidTab(root: ParentNode, active: string): { owner: string; control: HTMLInputElement } | null {
  const invalid = invalidControls(root);

  if (invalid.length === 0 || invalid.some((el) => tabOf(el) === active)) return null;

  const control = invalid.find((el) => tabOf(el));

  const owner = control && tabOf(control);

  return control && owner ? { owner, control } : null;
}

export function useRevealInvalidTab<T extends string>(active: T | undefined, setActive: (tab: T) => void) {
  const handled = useRef(false);

  return (e: SyntheticEvent<HTMLElement>) => {
    if (handled.current || !active) return;

    handled.current = true;

    const found = findInvalidTab(e.currentTarget, active);

    if (found) setActive(found.owner as T);

    // reportValidity re-fires `invalid`, so the flag is released only after it
    requestAnimationFrame(() => {
      if (found) found.control.reportValidity();

      handled.current = false;
    });
  };
}
