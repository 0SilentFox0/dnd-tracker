export function revealInvalidTab(root: ParentNode | null, active: string, target: EventTarget | null): string | null {
  const activeFields = root?.querySelectorAll<HTMLInputElement>(`[data-tab-id="${active}"] :is(input, textarea, select)`) ?? [];

  if (Array.from(activeFields).some((el) => el.willValidate && !el.validity.valid)) return null;

  const owner = (target as HTMLElement | null)?.closest<HTMLElement>("[data-tab-id]")?.dataset.tabId;

  return owner && owner !== active ? owner : null;
}
