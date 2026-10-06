"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { CharacterViewClient } from "../../../character/character-view-client";
import { DmCharacterEditForm } from "./DmCharacterEditForm";

import { LoadingState, QueryState } from "@/components/common/states";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDmCharacterEditor } from "@/lib/hooks/characters";

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const { id, characterId } = use(params);

  const router = useRouter();

  const editor = useDmCharacterEditor({ campaignId: id, characterId, onSaved: () => router.push(`/campaigns/${id}/dm/characters`) });

  const [viewAsPlayer, setViewAsPlayer] = useState(false);

  const characterLoading = <LoadingState rows={6} label="Завантаження персонажа…" />;

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Switch
            id="view-as-player"
            checked={viewAsPlayer}
            onCheckedChange={setViewAsPlayer}
          />
          <Label htmlFor="view-as-player" className="cursor-pointer">
            Перегляд як гравець
          </Label>
        </div>
        <span className="text-sm text-muted-foreground">
          {viewAsPlayer ? "Вигляд для гравця (isPlayer)" : "Редагування (DM)"}
        </span>
      </div>

      {viewAsPlayer ? (
        <CharacterViewClient
          campaignId={id}
          characterId={characterId}
          allowPlayerEdit={false}
        />
      ) : (
        <QueryState query={editor.query} loading={characterLoading}>
          {() => (editor.ready ? <DmCharacterEditForm editor={editor} /> : characterLoading)}
        </QueryState>
      )}
    </div>
  );
}
