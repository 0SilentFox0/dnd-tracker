type TickFn = (now: number, dt: number) => boolean | void;

interface Subscriber {
  fn: TickFn;
  last: number;
  gap: number;
}

const subscribers = new Set<Subscriber>();

let raf = 0;

function stop() {
  if (!raf) return;

  cancelAnimationFrame(raf);
  raf = 0;
}

function frame(now: number) {
  // Requested first so a throwing subscriber cannot stall the others.
  raf = requestAnimationFrame(frame);

  for (const sub of subscribers) {
    if (now - sub.last < sub.gap) continue;

    // A fresh subscriber paints on the next frame instead of waiting out a gap measured from subscribe time.
    const dt = sub.last === -Infinity ? 1 / 60 : (now - sub.last) / 1000;

    sub.last = now;

    try {
      if (sub.fn(now, dt) === false) subscribers.delete(sub);
    } catch (e) {
      subscribers.delete(sub);
      console.warn("fx tick", e);
    }
  }

  if (!subscribers.size) stop();
}

// One rAF loop for every canvas; `fn` returning false unsubscribes it. `fps` throttles one subscriber without slowing the rest.
export function subscribe(fn: TickFn, opts: { fps?: number } = {}) {
  // 2 ms slack so a 60 Hz display still paints every second frame at 30 fps.
  const sub: Subscriber = { fn, last: -Infinity, gap: opts.fps ? 1000 / opts.fps - 2 : 0 };

  subscribers.add(sub);
  raf ||= requestAnimationFrame(frame);

  return () => {
    subscribers.delete(sub);

    if (!subscribers.size) stop();
  };
}
