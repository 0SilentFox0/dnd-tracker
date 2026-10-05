"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { filterArtifactsSelectableForSet } from "./artifact-set-form-helpers";
import { ArtifactSetMembersPicker } from "./ArtifactSetMembersPicker";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createArtifactSet,
  deleteArtifactSet,
  updateArtifactSet,
} from "@/lib/api/artifact-sets";
import { type ArtifactListItem, getArtifacts } from "@/lib/api/artifacts";
import { abilitySaveError } from "@/lib/hooks/abilities";
import { useConfirm } from "@/lib/hooks/common";
import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";
import type { Ability } from "@/lib/utils/abilities/schema";

export interface ArtifactSetFormProps {
  campaignId: string;
  setId?: string;
  initialName?: string;
  initialDescription?: string | null;
  /** URL іконки (або data URL до збереження) — HUD бою при повному сеті */
  initialIcon?: string | null;
  initialSetBonus?: { name?: string; description?: string };
  initialAbilities?: Ability[];
  initialAbilityIssues?: ConversionIssue[];
  initialArtifactIds?: string[];
}

export function ArtifactSetForm({
  campaignId,
  setId,
  initialName = "",
  initialDescription = "",
  initialIcon = "",
  initialSetBonus = {},
  initialAbilities = [],
  initialAbilityIssues = [],
  initialArtifactIds = [],
}: ArtifactSetFormProps) {
  const confirm = useConfirm();

  const router = useRouter();

  const [name, setName] = useState(initialName);

  const [description, setDescription] = useState(initialDescription ?? "");

  const [icon, setIcon] = useState(initialIcon ?? "");

  const [bonusName, setBonusName] = useState(initialSetBonus.name ?? "");

  const [bonusDescription, setBonusDescription] = useState(initialSetBonus.description ?? "");

  const [abilities, setAbilities] = useState<Ability[]>(initialAbilities);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const abilitiesValid = abilityErrors === 0;

  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);

  const [selectedIds, setSelectedIds] = useState(
    () => new Set(initialArtifactIds),
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArtifacts(campaignId).then(setArtifacts).catch(console.error);
  }, [campaignId]);

  const selectableArtifacts = useMemo(
    () => filterArtifactsSelectableForSet(artifacts, setId),
    [artifacts, setId],
  );

  const toggleArtifact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilitiesValid) return;

    setError(null);

    setLoading(true);

    try {
      const payload = {
        name,
        description: description.trim() ? description : null,
        setBonus: { name: bonusName.trim() || undefined, description: bonusDescription.trim() || undefined },
        abilities,
        artifactIds: [...selectedIds],
        icon: icon.trim() ? icon : null,
      };

      if (setId) {
        await updateArtifactSet(campaignId, setId, payload);
      } else {
        await createArtifactSet(campaignId, payload);
      }

      router.push(`/campaigns/${campaignId}/dm/artifact-sets`);
      router.refresh();
    } catch (err) {
      setError(abilitySaveError(err, "Помилка збереження"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !setId ||
      !(await confirm({ title: "Видалити сет? Артефакти залишаться в кампанії, поле «Сет» у них буде очищено.", confirmLabel: "Видалити", destructive: true }))
    ) {
      return;
    }

    setLoading(true);

    try {
      await deleteArtifactSet(campaignId, setId);
      router.push(`/campaigns/${campaignId}/dm/artifact-sets`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <p className="text-sm text-destructive border border-destructive/50 rounded-md p-3">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="set-name">Назва сету *</Label>
        <Input
          id="set-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          placeholder="Наприклад, Спадщина дракона"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-desc">Опис (для довідки)</Label>
        <Textarea
          id="set-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Коротко про призначення сету"
        />
      </div>

      <div className="space-y-2">
        <ImageUpload
          value={icon}
          onChange={setIcon}
          label="Іконка для бою"
          placeholder="URL зображення або завантажте файл з комп’ютера"
          previewAlt="Іконка сету в бою"
        />
        <p className="text-xs text-muted-foreground">
          Показується біля портрета в битві при повному сеті. Завантажений файл
          зберігається в сховищі кампанії (як іконки артефактів), у базі лишається
          посилання.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-bonus-name">Назва бонусу</Label>
          <Input id="set-bonus-name" value={bonusName} onChange={(e) => setBonusName(e.target.value)} placeholder="Наприклад, Кров дракона" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-bonus-desc">Опис бонусу</Label>
          <Textarea id="set-bonus-desc" value={bonusDescription} onChange={(e) => setBonusDescription(e.target.value)} rows={2} />
        </div>
      </div>

      <AbilityListEditor
        campaignId={campaignId}
        value={abilities}
        onChange={setAbilities}
        issues={initialAbilityIssues}
        onValidityChange={(_, n) => setAbilityErrors(n)}
      />

      <ArtifactSetMembersPicker
        artifacts={selectableArtifacts}
        selectedIds={selectedIds}
        onToggle={toggleArtifact}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !name.trim() || !abilitiesValid}>
          {loading ? "Збереження…" : withAbilityErrors(setId ? "Зберегти зміни" : "Створити сет", abilityErrors)}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>
            Скасувати
          </Link>
        </Button>
        {setId && (
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
          >
            Видалити сет
          </Button>
        )}
      </div>
    </form>
  );
}
