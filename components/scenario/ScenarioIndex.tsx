"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { groupIndex } from "@/lib/utils/scenario/index-groups";
import type { ScenarioPageSummary } from "@/types/scenario";

type Move = (id: string, dir: -1 | 1, siblings: ScenarioPageSummary[]) => void;

function IndexRow({ campaignId, page, num, siblings, onMove }: { campaignId: string; page: ScenarioPageSummary; num: string; siblings: ScenarioPageSummary[]; onMove: Move }) {
  const t = useTranslations("scenario");

  return (
    <li className="sb-index-row">
      <span className="num">{num}</span>
      <span className="t">
        <Link href={`/campaigns/${campaignId}/dm/scenario/${page.id}`}>{page.title}</Link>
        {page.subtitle && <span className="d">{page.subtitle}</span>}
      </span>
      <span className={page.status === "ready" ? "st ok" : "st"}>{t(`pageStatuses.${page.status}`)}</span>
      <span className="mv">
        <button type="button" aria-label={t("index.up", { title: page.title })} onClick={() => onMove(page.id, -1, siblings)}>
          <ChevronUp className="size-4" />
        </button>
        <button type="button" aria-label={t("index.down", { title: page.title })} onClick={() => onMove(page.id, 1, siblings)}>
          <ChevronDown className="size-4" />
        </button>
      </span>
    </li>
  );
}

export function ScenarioIndex({ campaignId, pages, onMove }: { campaignId: string; pages: ScenarioPageSummary[]; onMove: Move }) {
  const t = useTranslations("scenario");

  const groups = groupIndex(pages);

  const flat = (list: ScenarioPageSummary[], numbers?: number[]) =>
    list.map((p, i) => <IndexRow key={p.id} campaignId={campaignId} page={p} num={numbers ? String(numbers[i]) : "·"} siblings={list} onMove={onMove} />);

  return (
    <>
      {groups.arcs.length > 0 && <h2>{t("index.scenes")}</h2>}
      {groups.arcs.map((g) => (
        <div key={g.arc}>
          <p className="arc">{g.arc || t("unarched")}</p>
          <ol>{flat(g.pages, g.pages.map((p) => p.number))}</ol>
        </div>
      ))}
      {groups.heroes.length > 0 && (
        <>
          <h2>{t("index.heroes")}</h2>
          <ol>{flat(groups.heroes)}</ol>
        </>
      )}
      {groups.notes.length > 0 && (
        <>
          <h2>{t("index.notes")}</h2>
          <ol>{flat(groups.notes)}</ol>
        </>
      )}
    </>
  );
}
