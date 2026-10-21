"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { AI_IMAGE_ASPECTS, AI_IMAGE_PROMPT_MAX, AI_PROVIDER_LABELS, type AiImageAspect, type AiProvider } from "@/lib/constants/ai";
import { useGenerateSlide } from "@/lib/hooks/show";

const FORM_ID = "generate-slide-form";

export function GenerateSlideDialog({ campaignId, open, onOpenChange, onAdd }: { campaignId: string; open: boolean; onOpenChange(open: boolean): void; onAdd(url: string): void }) {
  const gen = useGenerateSlide(campaignId);

  const [prompt, setPrompt] = useState("");

  const [style, setStyle] = useState<boolean | null>(null);

  const [aspect, setAspect] = useState<AiImageAspect>("16:9");

  const [chosen, setChosen] = useState<{ provider?: AiProvider; model?: string }>({});

  const [result, setResult] = useState<string | null>(null);

  const option = gen.providers.find((p) => p.provider === chosen.provider) ?? gen.providers[0];

  const model = option?.models.find((m) => m.id === chosen.model) ?? option?.models[0];

  const useCampaignStyle = style ?? gen.hasInstructions;

  const run = async () => {
    if (!option || !model) return;

    setResult(null);
    setResult(await gen.generate({ prompt: prompt.trim(), provider: option.provider, model: model.id, aspect, useCampaignStyle }));
  };

  const close = (next: boolean) => {
    if (!next) {
      setResult(null);
      gen.reset();
    }

    onOpenChange(next);
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={close}
      title="Згенерувати зображення"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Скасувати
          </Button>
          {result ? (
            <>
              <Button type="button" variant="outline" disabled={gen.pending} onClick={() => void run()}>
                Ще раз
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onAdd(result);
                  setPrompt("");
                  close(false);
                }}
              >
                Додати слайд
              </Button>
            </>
          ) : (
            <Button type="submit" form={FORM_ID} disabled={!prompt.trim() || gen.pending || !option}>
              Згенерувати
            </Button>
          )}
        </>
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <Textarea aria-label="Опис зображення" placeholder="Опис зображення" rows={4} maxLength={AI_IMAGE_PROMPT_MAX} value={prompt} disabled={gen.pending} onChange={(e) => setPrompt(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={useCampaignStyle} disabled={gen.pending} onCheckedChange={(v) => setStyle(v === true)} />
          Додати стиль кампанії
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <SelectField
            aria-label="Співвідношення сторін"
            value={aspect}
            onValueChange={(v) => setAspect(v as AiImageAspect)}
            options={AI_IMAGE_ASPECTS.map((a) => ({ value: a, label: a }))}
            disabled={gen.pending}
          />
          <SelectField
            aria-label="Провайдер"
            value={option?.provider ?? ""}
            onValueChange={(v) => setChosen({ provider: v as AiProvider })}
            options={gen.providers.map((p) => ({ value: p.provider, label: AI_PROVIDER_LABELS[p.provider] }))}
            disabled={gen.pending}
          />
          <SelectField
            aria-label="Модель"
            value={model?.id ?? ""}
            onValueChange={(v) => setChosen({ provider: option?.provider, model: v })}
            options={(option?.models ?? []).map((m) => ({ value: m.id, label: m.label }))}
            disabled={gen.pending}
          />
        </div>
        {gen.pending && <p className="text-sm text-hud-muted">Генерую… це може тривати до хвилини</p>}
        {gen.error && !gen.pending && (
          <p role="alert" className="text-sm text-destructive">
            {gen.error}
          </p>
        )}
        {result && !gen.pending && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result} alt="Згенероване зображення" className="max-h-80 w-full rounded-md object-contain" />
        )}
      </form>
    </ResponsiveDialog>
  );
}
