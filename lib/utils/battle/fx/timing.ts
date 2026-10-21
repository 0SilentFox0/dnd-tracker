export const MAX_FX_BATCH = 16;

/**
 * A broken animation is abandoned after this, so it never stalls the queue. The longest run is Відродження лісу
 * on 6 targets (2700 + 5 × 120 ms stagger ≈ 3.3 s at 60 fps); the stage caps dt at 50 ms, so below 20 fps runs
 * stretch in wall-clock time, and 4.5 s still lets that run finish at ~15 fps.
 */
export const MAX_FX_MS = 4500;
