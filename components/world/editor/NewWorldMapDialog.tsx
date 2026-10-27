"use client";

import { type FormEvent, useState } from "react";

import { MapFileDropzone } from "./MapFileDropzone";
import { useWorldEditorContext } from "./WorldEditorContext";

import { Button } from "@/components/ui/button";
import { FormField, LabeledInput } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { WORLD_NAME_MAX } from "@/lib/constants/world";
import { useNotify } from "@/lib/hooks/common";
import { useWorldMapUpload } from "@/lib/hooks/world";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { WorldMarker } from "@/types/world";

const FORM_ID = "new-world-map-form";

interface Props {
  open: boolean;
  onOpenChange(v: boolean): void;
  parentMarker?: Pick<WorldMarker, "id" | "name">;
}

// the key remounts the form so every opening starts from a clean state
export function NewWorldMapDialog(props: Props) {
  return <NewWorldMapDialogForm key={`${props.open}:${props.parentMarker?.id}`} {...props} />;
}

function NewWorldMapDialogForm({ open, onOpenChange, parentMarker }: Props) {
  const { campaignId, editor, openMap } = useWorldEditorContext();

  const { upload, discard, uploading } = useWorldMapUpload(campaignId);

  const notify = useNotify();

  const [name, setName] = useState(parentMarker?.name ?? "");

  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const busy = uploading || editor.map.create.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!file || !name.trim()) return;

    let image;

    setError(null);

    try {
      image = await upload(file);
    } catch (err) {
      void notify(errorMessage(err, "Не вдалося завантажити картинку"));

      return;
    }

    try {
      const created = await editor.map.create.mutateAsync({ name: name.trim(), ...image, parentMarkerId: parentMarker?.id });

      onOpenChange(false);
      openMap(created.id);
    } catch (err) {
      setError(errorMessage(err, "Не вдалося створити карту"));
      void discard(image.imageUrl);
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={parentMarker ? "Карта для маркера" : "Нова карта"}
      description={parentMarker ? `Вкладена карта для «${parentMarker.name}»: відкриється, коли герої зайдуть у це місце.` : "Назва й картинка карти. Маркери, зони та вкладені карти додаються в редакторі."}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!file || !name.trim() || busy}>
            {busy ? "Завантаження…" : "Створити"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-3">
        <LabeledInput label="Назва" required maxLength={WORLD_NAME_MAX} value={name} error={error ?? undefined} onChange={(e) => setName(e.target.value)} />
        <FormField label="Картинка" required>
          <MapFileDropzone file={file} onFile={setFile} />
        </FormField>
      </form>
    </ResponsiveDialog>
  );
}
