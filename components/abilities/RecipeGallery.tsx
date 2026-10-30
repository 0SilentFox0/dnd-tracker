"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { AbilityCopySourcePicker } from "./AbilityCopySourcePicker";
import { AbilityFlow } from "./AbilityFlow";
import { useAbilityEditor } from "./editor-context";
import { RecipeForm } from "./RecipeForm";
import { useAbilityText } from "./use-ability-text";

import { HudChipTabs } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useRecipeValues } from "@/lib/hooks/abilities";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { Ability } from "@/lib/utils/abilities/schema";
import { summarizeAbility } from "@/lib/utils/abilities/summary";
import { buildRecipe, buildScratchAbility, type Recipe, RECIPE_CATEGORIES, type RecipeCategory, type RecipeResult, RECIPES } from "@/lib/utils/abilities/templates";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

type SpellPick = { effects: SpellEffect[]; concentration?: boolean };

type RecipeGalleryProps = { open: boolean; onOpenChange: (open: boolean) => void } & (
  | { scope: "ability"; onPick: (abilities: Ability[]) => void }
  | { scope: "spell"; onPick: (r: SpellPick) => void }
);

const ALL = "all";

function Preview({ result }: { result: RecipeResult }) {
  const text = useAbilityText();

  if ("ability" in result) return <AbilityFlow summary={summarizeAbility({ id: "", ...result.ability })} variant="card" as="span" />;

  return <span className="text-xs font-normal text-hud-muted">{result.spell.map((e) => text.effect(e)).join(" · ")}</span>;
}

export function RecipeGallery(props: RecipeGalleryProps) {
  const { open, onOpenChange, scope } = props;

  const t = useTranslations("abilities.templates");

  const tr = useTranslator("abilityRegistry");

  const { campaignId } = useAbilityEditor();

  const [category, setCategory] = useState<RecipeCategory | typeof ALL>(ALL);

  const [selected, setSelected] = useState<Recipe | null>(null);

  const [copying, setCopying] = useState(false);

  const [name, setName] = useState("");

  const note = tr("templates.custom.note");

  const ctx = useMemo(() => ({ scope, name, note }), [scope, name, note]);

  const form = useRecipeValues(selected, ctx);

  const recipes = useMemo(() => RECIPES.filter((r) => r.scopes.includes(scope) && (category === ALL || r.category === category)), [scope, category]);

  const cardCtx = useMemo(() => (r: Recipe) => ({ scope, name: tr(`templates.${r.id}.defaultName`), note }), [scope, tr, note]);

  const close = () => {
    setCategory(ALL);
    setSelected(null);
    setCopying(false);
    form.reset();
    onOpenChange(false);
  };

  const deliver = (result: RecipeResult) => {
    if ("ability" in result) {
      if (props.scope === "ability") props.onPick([{ id: "", ...result.ability }]);
    } else if (props.scope === "spell") {
      props.onPick({ effects: result.spell, ...(result.concentration ? { concentration: true } : {}) });
    }

    close();
  };

  const pickAbilities = (abilities: Ability[]) => {
    if (props.scope === "ability") props.onPick(abilities);

    close();
  };

  const choose = (recipe: Recipe) => {
    if (recipe.params.length > 0) {
      setName(tr(`templates.${recipe.id}.defaultName`));
      setSelected(recipe);

      return;
    }

    const built = buildRecipe(recipe, {}, cardCtx(recipe));

    if (built.ok) deliver(built.result);
  };

  const back = () => {
    form.reset();
    setSelected(null);
  };

  const submit = () => {
    if (form.built?.ok) deliver(form.built.result);
  };

  const scratch = () => pickAbilities([{ id: "", ...buildScratchAbility({ name: tr("templates.custom.defaultName"), note }) }]);

  const categories = [ALL, ...RECIPE_CATEGORIES] as const;

  const title = copying ? t("copyTitle") : selected ? tr(`templates.${selected.id}.label`) : t("addTitle");

  const footer = selected ? (
    <>
      <Button type="button" variant="outline" onClick={back}>
        {t("back")}
      </Button>
      <Button type="submit" form="recipe-form" disabled={!form.built?.ok}>
        {t("create")}
      </Button>
    </>
  ) : copying ? (
    <Button type="button" variant="outline" onClick={() => setCopying(false)}>
      {t("back")}
    </Button>
  ) : undefined;

  return (
    <ResponsiveDialog hud open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title={title} footer={footer}>
      {copying ? (
        <AbilityCopySourcePicker campaignId={campaignId} onPick={pickAbilities} />
      ) : selected ? (
        <form
          id="recipe-form"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            submit();
          }}
        >
          <RecipeForm recipe={selected} values={form.values} onChange={form.set} issues={form.built && !form.built.ok ? form.built.issues : []} name={scope === "ability" ? { value: name, onChange: setName } : undefined} />
          {form.built?.ok && (
            <div className="space-y-1">
              <p className="hud-sc text-xs text-hud-muted">{t("previewTitle")}</p>
              <Preview result={form.built.result} />
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-3">
          <HudChipTabs
            ariaLabel={t("addTitle")}
            items={categories.map((c) => ({ key: c, label: c === ALL ? t("allCategories") : tr(`templates.categories.${c}`), active: category === c, onSelect: () => setCategory(c) }))}
          />
          <div className="space-y-2">
            {recipes.map((r) => {
              const built = buildRecipe(r, {}, cardCtx(r));

              return (
                <Button key={r.id} type="button" variant="outline" className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-2 text-left" onClick={() => choose(r)}>
                  <span className="font-medium">{tr(`templates.${r.id}.label`)}</span>
                  <span className="text-xs font-normal text-muted-foreground">{tr(`templates.${r.id}.hint`)}</span>
                  {built.ok && <Preview result={built.result} />}
                </Button>
              );
            })}
            {scope === "ability" && (
              <>
                <Button type="button" variant="outline" className="h-auto w-full flex-col items-start whitespace-normal py-2 text-left" onClick={scratch}>
                  <span className="font-medium">{t("scratch")}</span>
                  <span className="text-xs font-normal text-muted-foreground">{t("scratchHint")}</span>
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={() => setCopying(true)}>
                  {t("copyFrom")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
