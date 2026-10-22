import { HudChipTabs } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import type { usePlayerDraftForm } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";
import { type AbilityMethod, POINT_BUY_BUDGET, STANDARD_ARRAY } from "@/lib/utils/characters/generate";

type DraftForm = ReturnType<typeof usePlayerDraftForm>;

interface AbilityScoresPickerProps {
  form: DraftForm["form"];
  scoreStatus: DraftForm["scoreStatus"];
  reveal: DraftForm["reveal"];
}

const METHODS: Array<{ key: AbilityMethod; label: string }> = [
  { key: "standard", label: "Стандартний масив" },
  { key: "pointBuy", label: `Point-buy (${POINT_BUY_BUDGET})` },
];

const MIN_SCORE = 8;

const MAX_SCORE = 15;

const CELL = "hud-roll-field flex items-center justify-between gap-2 rounded-lg border border-hud-rule px-3 py-2";

export function AbilityScoresPicker({ form, scoreStatus, reveal }: AbilityScoresPickerProps) {
  const { values, setScore, method, setMethod } = form;

  const shown = (key: AbilityKey) => (reveal.rolling && !reveal.settled.has(key) && key in reveal.display ? reveal.display[key] : values[key]);

  return (
    <div className="flex flex-col gap-3">
      <HudChipTabs ariaLabel="Спосіб розподілу" items={METHODS.map((m) => ({ key: m.key, label: m.label, active: method === m.key, onSelect: () => setMethod(m.key) }))} />

      {method === "pointBuy" && (
        <p className={cn("text-sm tabular-nums", scoreStatus.valid ? "text-hud-muted" : "text-[#f0b4a6]")}>
          Витрачено {scoreStatus.spent} / {POINT_BUY_BUDGET}
        </p>
      )}
      {method === "standard" && !scoreStatus.valid && <p className="text-sm text-[#f0b4a6]">Кожне значення масиву — рівно один раз</p>}

      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
        {ABILITY_KEYS.map((key) => {
          const spinning = reveal.rolling && !reveal.settled.has(key) && key in reveal.display;

          return (
            <div key={key} data-settled={reveal.settled.has(key)} data-rolling={spinning} className={CELL}>
              <label htmlFor={`score-${key}`} className="text-sm">
                {ABILITY_LABELS[key]}
              </label>
              {spinning ? (
                <span aria-hidden className="hud-roll-display w-10 text-center text-base font-semibold tabular-nums">
                  {shown(key)}
                </span>
              ) : method === "standard" ? (
                <select
                  id={`score-${key}`}
                  value={values[key]}
                  onChange={(e) => setScore(key, Number(e.target.value))}
                  className="h-9 w-16 rounded-md border border-input bg-transparent px-2 text-base tabular-nums"
                >
                  {STANDARD_ARRAY.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="outline" className="size-8" aria-label={`${ABILITY_LABELS[key]}: менше`} disabled={values[key] <= MIN_SCORE} onClick={() => setScore(key, values[key] - 1)}>
                    -
                  </Button>
                  <output id={`score-${key}`} className="w-7 text-center text-base font-semibold tabular-nums">
                    {values[key]}
                  </output>
                  <Button type="button" size="icon" variant="outline" className="size-8" aria-label={`${ABILITY_LABELS[key]}: більше`} disabled={values[key] >= MAX_SCORE} onClick={() => setScore(key, values[key] + 1)}>
                    +
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
