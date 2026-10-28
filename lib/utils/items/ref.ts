export const ITEM_REF_RE = /^[^+\s]{1,64}(\+[^+\s]{1,64})?$/;

export const itemRef = (baseId: string, propertyId?: string | null) => (propertyId ? `${baseId}+${propertyId}` : baseId);

export function parseItemRef(ref: string): { baseId: string; propertyId: string | null } | null {
  if (!ITEM_REF_RE.test(ref)) return null;

  const [baseId, propertyId] = ref.split("+");

  return { baseId, propertyId: propertyId ?? null };
}

export function refArtifactIds(ref: string): string[] {
  const parsed = parseItemRef(ref);

  if (!parsed) return [];

  return parsed.propertyId ? [parsed.baseId, parsed.propertyId] : [parsed.baseId];
}

export const isComposedRef = (ref: string) => parseItemRef(ref)?.propertyId != null;
