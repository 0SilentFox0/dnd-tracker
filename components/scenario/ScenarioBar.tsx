"use client";

import { type ReactNode, useRef } from "react";
import { List } from "lucide-react";

import { ActionsMenu, type ActionsMenuItem } from "@/components/common/ActionsMenu";
import { useCssVarHeight } from "@/lib/hooks/common";

type Props = { title: string; notes: { hidden: boolean; toggle: () => void }; toc?: { onOpen: () => void }; actions?: ReactNode; menu: ActionsMenuItem[] };

export function ScenarioBar({ title, notes, toc, actions, menu }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useCssVarHeight(ref, "--sb-bar-h");

  useCssVarHeight(ref, "--app-header-h", "header");

  return (
    <div ref={ref} className="sb-bar">
      <div className="sb-bar-in">
        {toc && (
          <button type="button" className="toggle sb-bar-toc" aria-label="Розділи" onClick={toc.onOpen}>
            <List className="size-4" /> <span className="sb-bar-toc-label">Розділи</span>
          </button>
        )}
        <strong>{title}</strong>
        <div className="sb-bar-btns">
          <button type="button" className="toggle" aria-pressed={notes.hidden} onClick={notes.toggle}>
            {notes.hidden ? "Показати нотатки" : "Сховати нотатки"}
          </button>
          {actions}
          {menu.length > 0 && <ActionsMenu actions={menu} label="Ще" triggerClassName="toggle sb-bar-more" />}
        </div>
      </div>
    </div>
  );
}
