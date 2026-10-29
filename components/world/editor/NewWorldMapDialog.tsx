"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

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

  const t = useTranslations("world");

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
      void notify(errorMessage(err, t("errors.uploadFailed")));

      return;
    }

    try {
      const created = await editor.map.create.mutateAsync({ name: name.trim(), ...image, parentMarkerId: parentMarker?.id });

      onOpenChange(false);
      openMap(created.id);
    } catch (err) {
      setError(errorMessage(err, t("errors.createMap")));
      void discard(image.imageUrl);
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={parentMarker ? t("newMap.titleMarker") : t("newMap.title")}
      description={parentMarker ? t("newMap.descriptionMarker", { name: parentMarker.name }) : t("newMap.description")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("newMap.cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!file || !name.trim() || busy}>
            {busy ? t("newMap.uploading") : t("newMap.create")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-3">
        <LabeledInput label={t("name")} required maxLength={WORLD_NAME_MAX} value={name} error={error ?? undefined} onChange={(e) => setName(e.target.value)} />
        <FormField label={t("newMap.image")} required>
          <MapFileDropzone file={file} onFile={setFile} />
        </FormField>
      </form>
    </ResponsiveDialog>
  );
}
