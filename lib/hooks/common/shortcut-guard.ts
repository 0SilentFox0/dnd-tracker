const TYPING = "input, textarea, select, [contenteditable]";

const DIALOG = '[role="dialog"]';

/** Single-key shortcuts must not fire while typing, with a modifier held, or under an open dialog. */
export function shortcutBlocked(e: KeyboardEvent): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;

  const target = e.target as HTMLElement | null;

  if (target?.closest?.(TYPING) || target?.isContentEditable) return true;

  return !!document.querySelector(DIALOG);
}
