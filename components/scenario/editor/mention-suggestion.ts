import type { ComponentProps } from "react";
import type { MentionNodeAttrs, MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

import { MentionList, type MentionListHandle } from "./MentionList";

import type { MentionOption } from "@/types/scenario";

const LIST_WIDTH = 288;

const LIST_HEIGHT = 288;

const GAP = 6;

type Props = SuggestionProps<MentionOption, MentionNodeAttrs>;

export function mentionSuggestion(search: (q: string) => Promise<MentionOption[]>): MentionOptions["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => search(query),
    render: () => {
      let renderer: ReactRenderer<MentionListHandle, ComponentProps<typeof MentionList>> | null = null;

      const place = (props: Props) => {
        const el = renderer?.element as HTMLElement | undefined;

        if (!el) return;

        let rect: { left: number; top: number; bottom: number } | null = props.clientRect?.() ?? null;

        if (!rect) {
          try {
            rect = props.editor.view.coordsAtPos(props.range.to);
          } catch {
            return;
          }
        }

        const width = el.offsetWidth || LIST_WIDTH;

        const height = el.offsetHeight || LIST_HEIGHT;

        const below = rect.bottom + GAP;

        const top = below + height > window.innerHeight && rect.top - GAP - height >= 0 ? rect.top - GAP - height : below;

        Object.assign(el.style, {
          position: "fixed",
          left: `${Math.max(0, Math.min(rect.left, window.innerWidth - width - GAP))}px`,
          top: `${Math.max(0, Math.min(top, window.innerHeight - height))}px`,
          zIndex: "60",
        });
      };

      const close = () => {
        renderer?.element.remove();
        renderer?.destroy();
        renderer = null;
      };

      return {
        onStart: (props) => {
          const created = new ReactRenderer<MentionListHandle, ComponentProps<typeof MentionList>>(MentionList, { props, editor: props.editor });

          renderer = created;
          document.body.appendChild(created.element);
          place(props);
        },
        onUpdate: (props) => {
          renderer?.updateProps(props);
          place(props);
        },
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === "Escape") {
            close();

            return true;
          }

          return renderer?.ref?.onKeyDown(event) ?? false;
        },
        onExit: close,
      };
    },
  };
}
