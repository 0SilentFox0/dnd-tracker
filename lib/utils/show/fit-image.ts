export function fitWithin(size: { width: number; height: number }, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(size.width, size.height));

  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}
