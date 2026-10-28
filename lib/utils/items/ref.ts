export const ITEM_REF_RE = /^[^+~\s]{1,64}(\+[^+~\s]{1,64})?(~[a-zA-Z0-9_-]{1,64})?$/;

export const itemRef = (baseId: string, propertyId?: string | null, param?: string | null) => `${propertyId ? `${baseId}+${propertyId}` : baseId}${param ? `~${param}` : ""}`;

export function parseItemRef(ref: string): { baseId: string; propertyId: string | null; param: string | null } | null {
  if (!ITEM_REF_RE.test(ref)) return null;

  const [item, param] = ref.split("~");

  const [baseId, propertyId] = item.split("+");

  return { baseId, propertyId: propertyId ?? null, param: param ?? null };
}

export function refArtifactIds(ref: string): string[] {
  const parsed = parseItemRef(ref);

  if (!parsed) return [];

  return parsed.propertyId ? [parsed.baseId, parsed.propertyId] : [parsed.baseId];
}

export const isComposedRef = (ref: string) => parseItemRef(ref)?.propertyId != null;
