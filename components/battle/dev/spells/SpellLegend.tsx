const ROWS: [string, string][] = [
  ["Анімація", "архетип, який бій програє для цього закляття (від заклинателя до цілей)."],
  ["Стихія", "палітра анімації та рамки; кольорова крапка — основний колір."],
  ["Рамка влучання", "рамка навколо рядка цілі, коли змінюється її HP; «—» — закляття не змінює HP."],
  ["Аура", "аура навколо портрета цілі від накладених ефектів; «—» — ефектів з аурою немає."],
];

export function SpellLegend() {
  return (
    <section aria-label="Легенда" className="rounded-xl border border-hud-rule bg-[rgba(17,14,11,.82)] p-3 text-xs text-hud-muted">
      <p className="mb-2 text-hud-bone">
        Кожне закляття кастується через рушій бою на тестовій арені (усі рятівні кидки провалені, кубики — четвірки), тож відображення збігається з тим, що побачать гравці. ▶ програє анімацію, рамки й аури на арені.
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
