"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArtifactDeleteButton } from "@/components/artifacts/ArtifactDeleteButton";
import { OptimizedImage } from "@/components/common/OptimizedImage";
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

export interface ArtifactCardData {
  id: string;
  name: string;
  slot: string;
  rarity: string | null;
  icon: string | null;
  description: string | null;
  passiveAbility: unknown;
  artifactSet?: { name: string } | null;
}

function formatPassiveAbility(
  passiveAbility: unknown
): { title?: string; description: string } | null {
  if (!passiveAbility) return null;
  if (typeof passiveAbility === "string") {
    return { description: passiveAbility };
  }
  if (typeof passiveAbility === "object") {
    const value = passiveAbility as { name?: string; description?: string };
    return {
      title: value.name,
      description: value.description || JSON.stringify(passiveAbility),
    };
  }
  return { description: String(passiveAbility) };
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
  const router = useRouter();
  const [slot, setSlot] = useState(artifact.slot);
  const [updating, setUpdating] = useState(false);

  const passive = formatPassiveAbility(artifact.passiveAbility);

  const handleSlotChange = async (newSlot: string) => {
    if (newSlot === slot) return;
    setUpdating(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/artifacts/${artifact.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot: newSlot }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося оновити слот");
      }
      setSlot(newSlot);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const slotSelect = (
    <Select
      value={slot}
      onValueChange={handleSlotChange}
      disabled={updating}
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
          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {artifact.icon ? (
              <OptimizedImage
                src={artifact.icon}
                alt={artifact.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                fallback={
                  <span className="text-sm text-muted-foreground">
                    {artifact.name[0]?.toUpperCase() || "?"}
                  </span>
                }
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                {artifact.name[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
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
        {passive && (
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold">{passive.title || "Ефект"}:</span>{" "}
            {passive.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 relative">
            {artifact.icon ? (
              <OptimizedImage
                src={artifact.icon}
                alt={artifact.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-xl text-muted-foreground">
                      {artifact.name[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-xl text-muted-foreground">
                  {artifact.name[0]?.toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>
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
        {passive && (
          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-semibold">
              {passive.title || "Ефект"}:
            </span>{" "}
            {passive.description}
          </p>
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
