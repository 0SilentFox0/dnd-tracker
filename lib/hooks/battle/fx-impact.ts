const RECENT = 32;

const fired: string[] = [];

const listeners = new Map<string, Set<() => void>>();

export function fireFxImpact(actionId: string) {
  if (!fired.includes(actionId)) {
    fired.push(actionId);

    if (fired.length > RECENT) fired.shift();
  }

  for (const cb of [...(listeners.get(actionId) ?? [])]) cb();
}

/** Кадр влучання чекає удару анімації своєї дії; `waitMs` — запобіжник, якщо анімацію пропущено. */
export function onFxImpact(actionId: string, waitMs: number, cb: () => void): () => void {
  let done = false;

  const set = listeners.get(actionId) ?? new Set<() => void>();

  const timer = setTimeout(finish, waitMs);

  const cleanup = () => {
    clearTimeout(timer);
    set.delete(finish);

    if (!set.size && listeners.get(actionId) === set) listeners.delete(actionId);
  };

  function finish() {
    if (done) return;

    done = true;
    cleanup();
    cb();
  }

  if (fired.includes(actionId)) {
    // підписка з ефекту: колбек не має кликати setState синхронно
    clearTimeout(timer);
    queueMicrotask(finish);

    return () => {
      done = true;
    };
  }

  listeners.set(actionId, set);
  set.add(finish);

  return () => {
    done = true;
    cleanup();
  };
}
