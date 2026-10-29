"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Trash2, Users } from "lucide-react";

import { DmCharacterCard } from "@/components/characters/list/DmCharacterCard";
import { PartyRestActions } from "@/components/characters/rest/PartyRestActions";
import { PendingDraftsPanel } from "@/components/characters/review/PendingDraftsPanel";
import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, LoadingState, QueryState } from "@/components/common/states";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { useDmCharactersPage } from "@/lib/hooks/characters";

const TABS: { id: "all" | "players" | "npcHeroes"; type?: CharacterTypeValue }[] = [
  { id: "all" },
  { id: "players", type: CharacterType.PLAYER },
  { id: "npcHeroes", type: CharacterType.NPC_HERO },
];

interface DMCharactersClientProps {
  campaignId: string;
  type?: CharacterTypeValue;
  maxLevel: number;
}

export function DMCharactersClient({ campaignId, type, maxLevel }: DMCharactersClientProps) {
  const t = useTranslations("characters.list");

  const page = useDmCharactersPage(campaignId, type);

  const characterCount = page.query.data?.length ?? 0;

  const base = `/campaigns/${campaignId}/dm/characters`;

  const newHref = type ? `${base}/new?type=${type}` : `${base}/new`;

  return (
    <HudPage>
      <HudPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <PartyRestActions campaignId={campaignId} characters={page.query.data ?? []} />
            <DeleteAllButton
              count={characterCount}
              noun={t("deleteAllNoun")}
              confirm={{
                title: t("deleteAllTitle"),
                label: t("deleteAllLabel"),
                description: t("deleteAllDescription"),
              }}
              view={{ icon: <Trash2 className="mr-2 h-4 w-4" /> }}
              status={{ isPending: page.status.isDeletingAll }}
              actions={{ onConfirm: page.actions.removeAll }}
            />
            <Button className="whitespace-nowrap" asChild>
              <Link href={newHref}>{t("create")}</Link>
            </Button>
          </>
        }
      >
        <HudChipTabs
          ariaLabel={t("typeTabs")}
          items={TABS.map((tab) => ({
            key: tab.id,
            label: t(`tabs.${tab.id}`),
            href: tab.type ? `${base}?type=${tab.type}` : base,
            active: tab.type === type,
          }))}
        />
      </HudPageHeader>

      <PendingDraftsPanel campaignId={campaignId} />

      <QueryState
        query={page.query}
        loading={<LoadingState rows={6} label={t("loading")} />}
        empty={
          <EmptyState
            icon={Users}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button asChild>
                <Link href={newHref}>{t("createFirst")}</Link>
              </Button>
            }
          />
        }
      >
        {() => (
          <>
            <SearchInput value={page.search.query.value} onChange={page.search.query.set} label={t("searchLabel")} placeholder={t("searchPlaceholder")} />
            {page.search.items.length === 0 ? (
              <SearchEmptyState query={page.search.query.value} onClear={() => page.search.query.set("")} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {page.search.items.map((character) => (
                  <DmCharacterCard
                    key={character.id}
                    character={character}
                    campaignId={campaignId}
                    busy={page.status.levelingUpId === character.id}
                    maxLevel={maxLevel}
                    actions={{ onLevelUp: character.level < maxLevel ? () => page.actions.levelUp(character) : undefined, onDelete: () => void page.actions.confirmDelete(character) }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </QueryState>
    </HudPage>
  );
}
