type Listener = (e: MediaQueryListEvent) => void;

export function mockMatchMedia(isMobile: boolean) {
  let matches = isMobile;

  const listeners = new Set<Listener>();

  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("max-width") ? matches : !matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    addListener: (l: Listener) => listeners.add(l),
    removeListener: (l: Listener) => listeners.delete(l),
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;

  return {
    set(next: boolean) {
      matches = next;
      for (const l of listeners) l({ matches: next } as MediaQueryListEvent);
    },
  };
}
