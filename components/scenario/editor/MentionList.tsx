"use client";

import { type Ref, useImperativeHandle, useState } from "react";
import type { MentionNodeAttrs } from "@tiptap/extension-mention";

import { MENTION_LABELS } from "@/lib/constants/scenario";
import type { MentionOption } from "@/types/scenario";

export type MentionListHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

export function MentionList({ items, command, ref }: { items: MentionOption[]; command: (attrs: MentionNodeAttrs) => void; ref?: Ref<MentionListHandle> }) {
  const [active, setActive] = useState(0);

  const index = active < items.length ? active : 0;

  const pick = (item: MentionOption) => command({ id: item.id, label: item.label, type: item.type } as MentionNodeAttrs);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;

      if (event.key === "ArrowDown") return setActive((index + 1) % items.length), true;

      if (event.key === "ArrowUp") return setActive((index - 1 + items.length) % items.length), true;

      if (event.key === "Enter") return pick(items[index]), true;

      return false;
    },
  }));

  return (
    <div className="hud-surface max-h-72 w-72 overflow-y-auto rounded-md border border-[#3a2f20] bg-[#14110d] p-1 text-sm shadow-xl" role="listbox">
      {items.length === 0 && <div className="px-2 py-1.5 text-hud-muted">Нічого не знайдено</div>}
      {items.map((item, i) => (
        <button
          key={`${item.type}-${item.id}`}
          type="button"
          role="option"
          aria-selected={i === index}
          className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left ${i === index ? "bg-white/10" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(item)}
        >
          <span className="truncate">{item.label}</span>
          <span className="shrink-0 text-xs text-hud-muted">{MENTION_LABELS[item.type]}</span>
        </button>
      ))}
    </div>
  );
}
