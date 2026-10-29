"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TRACK_FILE_ACCEPT } from "@/lib/constants/music";

export function UploadTrackButton({ onFile, pending }: { onFile: (file: File) => void; pending: boolean }) {
  const t = useTranslations("music");

  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={TRACK_FILE_ACCEPT}
        hidden
        aria-label={t("upload.fileLabel")}
        onChange={(e) => {
          const file = e.target.files?.[0];

          e.target.value = "";

          if (file) onFile(file);
        }}
      />
      <Button onClick={() => input.current?.click()} disabled={pending} className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        {pending ? t("upload.pending") : t("upload.button")}
      </Button>
    </>
  );
}
