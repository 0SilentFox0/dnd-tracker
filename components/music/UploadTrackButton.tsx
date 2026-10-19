"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UploadTrackButton({ onFile, pending }: { onFile: (file: File) => void; pending: boolean }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".mp3,.m4a,audio/mpeg,audio/mp4"
        hidden
        aria-label="Файл треку"
        onChange={(e) => {
          const file = e.target.files?.[0];

          e.target.value = "";

          if (file) onFile(file);
        }}
      />
      <Button onClick={() => input.current?.click()} disabled={pending} className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        {pending ? "Завантаження…" : "Завантажити MP3"}
      </Button>
    </>
  );
}
