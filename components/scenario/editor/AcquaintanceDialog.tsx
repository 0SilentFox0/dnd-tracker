"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import type { AcquaintanceDialogTarget } from "./acquaintance-target";

import { IconUrlField } from "@/components/common/IconUrlField";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { CharacterSelect } from "@/components/scenario/CharacterSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { ACQUAINTANCE_LIMITS } from "@/lib/constants/acquaintances";
import { useAcquaintanceActions, useAcquaintances } from "@/lib/hooks/acquaintances";
import { useCharacters } from "@/lib/hooks/characters";
import { useConfirm, useSearch } from "@/lib/hooks/common";
import type { AcquaintanceKind, AcquaintanceView } from "@/types/acquaintances";

export type { AcquaintanceDialogTarget } from "./acquaintance-target";

type Section = { id: string; title: string };

interface Props {
  campaignId: string;
  target: AcquaintanceDialogTarget;
  sections: Section[];
  onInsert: (mention: { id: string; label: string }) => void;
  onClose: () => void;
}

interface Fields {
  kind: AcquaintanceKind;
  characterId: string;
  name: string;
  description: string;
  avatarUrl: string;
}

const FORM_ID = "acquaintance-form";

const KINDS: AcquaintanceKind[] = ["micro", "character"];

const fieldsOf = (a: AcquaintanceView) => [a.name];

const sectionTitle = (sections: Section[], pageId: string, sectionId: string, currentPageId: string, otherPage: string) =>
  pageId !== currentPageId ? otherPage : (sections.find((s) => s.id === sectionId)?.title ?? otherPage);

function AcquaintanceForm({ campaignId, fields, onChange, onSubmit }: { campaignId: string; fields: Fields; onChange: (patch: Partial<Fields>) => void; onSubmit: () => void }) {
  const t = useTranslations("scenario.acquaintance");

  const { data: roster = [] } = useCharacters(campaignId, { compact: true, enabled: fields.kind === "character" });

  const pickCharacter = (characterId: string) => onChange({ characterId, ...(!fields.name.trim() && { name: roster.find((c) => c.id === characterId)?.name ?? "" }) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-3">
      <div className="flex gap-2" role="group" aria-label={t("kindGroup")}>
        {KINDS.map((kind) => (
          <Button key={kind} type="button" size="sm" variant={fields.kind === kind ? "secondary" : "outline"} aria-pressed={fields.kind === kind} onClick={() => onChange({ kind })}>
            {t(`kinds.${kind}`)}
          </Button>
        ))}
      </div>
      {fields.kind === "character" && (
        <div className="space-y-1">
          <Label htmlFor="acq-character">{t("character")}</Label>
          <CharacterSelect campaignId={campaignId} id="acq-character" value={fields.characterId} onValueChange={pickCharacter} />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="acq-name">{t("name")}</Label>
        <Input id="acq-name" value={fields.name} maxLength={ACQUAINTANCE_LIMITS.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      {fields.kind === "micro" && (
        <div className="space-y-1">
          <Label htmlFor="acq-description">{t("description")}</Label>
          <Textarea id="acq-description" value={fields.description} maxLength={ACQUAINTANCE_LIMITS.description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
      )}
      {fields.kind === "micro" && <IconUrlField id="acq-avatar" label={t("avatar")} value={fields.avatarUrl} onChange={(avatarUrl) => onChange({ avatarUrl })} fallbackText={fields.name} />}
    </form>
  );
}

const canSubmit = (f: Fields) => !!f.name.trim() && (f.kind !== "character" || !!f.characterId);

const payload = (f: Fields) => ({ kind: f.kind, characterId: f.kind === "character" ? f.characterId : null, name: f.name.trim(), ...(f.kind === "micro" && { description: f.description, avatarUrl: f.avatarUrl.trim() || null }) });

function useFields(initial: Fields) {
  const [fields, setFields] = useState(initial);

  return [fields, (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }))] as const;
}

function ExistingList({ items, onPick }: { items: AcquaintanceView[]; onPick: (a: AcquaintanceView) => void }) {
  const t = useTranslations("scenario.acquaintance");

  const search = useSearch(items, fieldsOf);

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-hud-muted">{t("existing")}</p>
      <SearchInput value={search.query.value} onChange={search.query.set} label={t("search")} />
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {search.items.map((a) => (
          <Button key={a.id} type="button" variant="ghost" className="justify-start" onClick={() => onPick(a)}>
            {a.name}
          </Button>
        ))}
        {search.isActive && search.items.length === 0 && <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />}
      </div>
    </div>
  );
}

function CreateBody({ campaignId, target, onInsert, onClose }: Props & { target: Extract<AcquaintanceDialogTarget, { mode: "create" }> }) {
  const t = useTranslations("scenario.acquaintance");

  const tActions = useTranslations("common.actions");

  const { data } = useAcquaintances(campaignId);

  const { create } = useAcquaintanceActions(campaignId);

  const [fields, change] = useFields({ kind: "micro", characterId: "", name: target.name, description: "", avatarUrl: "" });

  const submit = async () => {
    const created = await create.mutateAsync({ ...payload(fields), sourcePageId: target.pageId, sourceSectionId: target.sectionId }).catch(() => null);

    if (!created) return;

    onInsert({ id: created.id, label: created.name });
    onClose();
  };

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {tActions("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!canSubmit(fields) || create.isPending}>
            {tActions("create")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ExistingList items={data?.items ?? []} onPick={(a) => { onInsert({ id: a.id, label: a.name }); onClose(); }} />
        <AcquaintanceForm campaignId={campaignId} fields={fields} onChange={change} onSubmit={() => void submit()} />
      </div>
    </ResponsiveDialog>
  );
}

function Journal({ campaignId, item, target, sections }: { campaignId: string; item: AcquaintanceView; target: Extract<AcquaintanceDialogTarget, { mode: "edit" }>; sections: Section[] }) {
  const t = useTranslations("scenario.acquaintance");

  const tActions = useTranslations("common.actions");

  const { addEntry, removeEntry } = useAcquaintanceActions(campaignId);

  const confirm = useConfirm();

  const [sectionId, setSectionId] = useState(target.sectionId);

  const [text, setText] = useState("");

  const add = async () => {
    const created = await addEntry.mutateAsync({ id: item.id, data: { pageId: target.pageId, sectionId, text: text.trim() } }).catch(() => null);

    if (created) setText("");
  };

  const remove = async (entryId: string) => {
    if (await confirm({ title: t("deleteEntryTitle"), confirmLabel: tActions("delete") })) await removeEntry.mutateAsync({ id: item.id, entryId }).catch(() => null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-hud-muted">{t("journal")}</p>
      {item.entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-2 rounded border border-hud-line p-2 text-sm">
          <div>
            <p>{e.text}</p>
            <p className="text-xs text-hud-muted">{sectionTitle(sections, e.pageId, e.sectionId, target.pageId, t("otherPage"))}{e.hidden ? t("hiddenSuffix") : ""}</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => void remove(e.id)}>
            {tActions("delete")}
          </Button>
        </div>
      ))}
      <SelectField aria-label={t("entrySection")} value={sectionId} onValueChange={setSectionId} options={sections.map((s) => ({ value: s.id, label: s.title }))} />
      <Textarea aria-label={t("entryText")} value={text} maxLength={ACQUAINTANCE_LIMITS.entry} onChange={(e) => setText(e.target.value)} />
      <Button type="button" size="sm" disabled={!text.trim() || addEntry.isPending} onClick={() => void add()}>
        {t("addEntry")}
      </Button>
    </div>
  );
}

function EditBody({ campaignId, target, sections, onClose }: Props & { target: Extract<AcquaintanceDialogTarget, { mode: "edit" }> }) {
  const t = useTranslations("scenario.acquaintance");

  const tActions = useTranslations("common.actions");

  const { data } = useAcquaintances(campaignId);

  const { update, remove } = useAcquaintanceActions(campaignId);

  const confirm = useConfirm();

  const item = data?.items.find((a) => a.id === target.id);

  const [fields, change] = useFields({ kind: item?.kind ?? "micro", characterId: item?.characterId ?? "", name: item?.name ?? "", description: item?.description ?? "", avatarUrl: item?.avatarUrl ?? "" });

  const save = async () => {
    const saved = await update.mutateAsync({ id: target.id, data: payload(fields) }).catch(() => null);

    if (saved) onClose();
  };

  const destroy = async () => {
    if (!(await confirm({ title: t("deleteTitle"), description: t("deleteDescription"), confirmLabel: tActions("delete") }))) return;

    if (await remove.mutateAsync(target.id).then(() => true, () => false)) onClose();
  };

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="destructive" onClick={() => void destroy()}>
            {t("delete")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {tActions("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!item || !canSubmit(fields) || update.isPending}>
            {tActions("save")}
          </Button>
        </>
      }
    >
      {!item ? (
        <p className="text-sm text-hud-muted">{t("notFound")}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-hud-muted">{t("source", { section: sectionTitle(sections, item.sourcePageId, item.sourceSectionId, target.pageId, t("otherPage")) })}</p>
          <AcquaintanceForm campaignId={campaignId} fields={fields} onChange={change} onSubmit={() => void save()} />
          <Journal campaignId={campaignId} item={item} target={target} sections={sections} />
        </div>
      )}
    </ResponsiveDialog>
  );
}

export function AcquaintanceDialog(props: Props) {
  const { target } = props;

  return target.mode === "create" ? <CreateBody {...props} target={target} /> : <EditBody {...props} target={target} />;
}
