const ROWS: [string, string][] = [
  ["Animation", "the archetype the battle plays for this spell (from the caster to the targets)."],
  ["Element", "palette of the animation and the frame; the colored dot is the main color."],
  ["Hit frame", "the frame around the target row when its HP changes; \"—\" means the spell does not change HP."],
  ["Aura", "the aura around the target portrait from applied effects; \"—\" means no effect has an aura."],
];

export function SpellLegend() {
  return (
    <section aria-label="Legend" className="rounded-xl border border-hud-rule bg-[rgba(17,14,11,.82)] p-3 text-xs text-hud-muted">
      <p className="mb-2 text-hud-bone">
        Every spell is cast through the battle engine on a test arena (all saving throws fail, dice roll fours), so the display matches what players will see. ▶ plays the animation, frames and auras on the arena.
      </p>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {ROWS.map(([term, text]) => (
          <div key={term}>
            <dt className="inline font-bold text-hud-bone">{term}</dt> — <dd className="inline">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
