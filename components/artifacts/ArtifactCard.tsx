"use client";

import { useState } from "react";
import Link from "next/link";

import { AbilitySummary } from "@/components/abilities";
import { ArtifactDeleteButton } from "@/components/artifacts/ArtifactDeleteButton";
import { EntityIcon } from "@/components/common/EntityIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARTIFACT_SLOT_OPTIONS } from "@/lib/constants/artifacts";
import { useUpdateArtifact } from "@/lib/hooks/artifacts";
import { useNotify } from "@/lib/hooks/common";

export interface ArtifactCardData {
  id: string;
  name: string;
  slot: string;
  rarity: string | null;
  icon: string | null;
  description: string | null;
  abilitySummary: string[];
  artifactSet?: { name: string } | null;
}

interface ArtifactCardProps {
  campaignId: string;
  artifact: ArtifactCardData;
  variant?: "full" | "compact";
}

export function ArtifactCard({
  campaignId,
  artifact,
  variant = "full",
}: ArtifactCardProps) {
  const notify = useNotify();

  const update = useUpdateArtifact(campaignId);

  const [slot, setSlot] = useState(artifact.slot);

  const handleSlotChange = (newSlot: string) => {
    if (newSlot === slot) return;

    const prev = slot;

    setSlot(newSlot);
    update.mutate(
      { artifactId: artifact.id, data: { slot: newSlot } },
      {
        onError: () => {
          setSlot(prev);
          void notify("Не вдалося змінити слот");
        },
      },
    );
  };

  const slotSelect = (
    <Select
      value={slot}
      onValueChange={handleSlotChange}
      disabled={update.isPending}
    >
      <SelectTrigger
        className={
          variant === "compact"
            ? "h-8 w-[140px] text-xs"
            : "h-9 w-full max-w-[180px]"
        }
      >
        <SelectValue placeholder="Слот" />
      </SelectTrigger>
      <SelectContent>
        {ARTIFACT_SLOT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (variant === "compact") {
    return (
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-2">
          <EntityIcon src={artifact.icon} name={artifact.name} size={40} className="text-sm" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{artifact.name}</p>
            <div className="flex gap-2 flex-wrap items-center mt-1">
              {artifact.rarity && (
                <Badge variant="outline" className="text-xs">
                  {artifact.rarity}
                </Badge>
              )}
              {slotSelect}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link href={`/campaigns/${campaignId}/dm/artifacts/${artifact.id}`}>
              <Button variant="ghost" size="sm">
                Редагувати
              </Button>
            </Link>
            <ArtifactDeleteButton
              campaignId={campaignId}
              artifactId={artifact.id}
            />
          </div>
        </div>
        {artifact.description && (
          <p className="text-xs text-muted-foreground mt-2">
            {artifact.description}
          </p>
        )}
        {artifact.abilitySummary.length > 0 && (
          <div className="mt-2">
            <AbilitySummary lines={artifact.abilitySummary} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3 mb-2">
          <EntityIcon src={artifact.icon} name={artifact.name} size={64} className="size-12 rounded-lg text-xl sm:size-16" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base flex-1 min-w-0 truncate">
                {artifact.name}
              </CardTitle>
              {artifact.rarity && (
                <Badge variant="outline" className="shrink-0">
                  {artifact.rarity}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
          {slotSelect}
          {artifact.artifactSet && (
            <Badge variant="outline">Сет: {artifact.artifactSet.name}</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {artifact.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {artifact.description}
          </p>
        )}
        {artifact.abilitySummary.length > 0 && (
          <div className="mb-2">
            <AbilitySummary lines={artifact.abilitySummary} />
          </div>
        )}
        <div className="flex gap-2">
          <Link
            href={`/campaigns/${campaignId}/dm/artifacts/${artifact.id}`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              Редагувати
            </Button>
          </Link>
          <ArtifactDeleteButton
            campaignId={campaignId}
            artifactId={artifact.id}
          />
        </div>
      </CardContent>
    </Card>
  );
}
