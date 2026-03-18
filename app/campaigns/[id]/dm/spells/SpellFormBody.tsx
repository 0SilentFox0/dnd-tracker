"use client";

import type { SpellFormData } from "./spell-form-defaults";
import { SpellFormBasicFields } from "./SpellFormBasicFields";
import { SpellFormEffectsAndMeta } from "./SpellFormEffectsAndMeta";
import { SpellFormSavingThrow } from "./SpellFormSavingThrow";

export interface SpellFormBodyProps {
  campaignId: string;
  formData: SpellFormData;
  setFormData: (data: SpellFormData | ((prev: SpellFormData) => SpellFormData)) => void;
  spellGroups: { id: string; name: string }[];
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
  error?: string | null;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function SpellFormBody({
  campaignId,
  formData,
  setFormData,
  spellGroups,
  onSubmit,
  isSubmitting,
  submitLabel,
  error,
  onDelete,
  isDeleting,
}: SpellFormBodyProps) {
  return (
    <>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Помилка:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-6">
        <SpellFormBasicFields
          formData={formData}
          setFormData={setFormData}
          spellGroups={spellGroups}
        />
        <SpellFormSavingThrow formData={formData} setFormData={setFormData} />
        <SpellFormEffectsAndMeta
          campaignId={campaignId}
          formData={formData}
          setFormData={setFormData}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </form>
    </>
  );
}
