import type { ComponentProps } from "react";
import type { MentionNodeAttrs, MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

import { MentionList, type MentionListHandle } from "./MentionList";

import type { MentionOption } from "@/types/scenario";

type Props = SuggestionProps<MentionOption, MentionNodeAttrs>;

export function mentionSuggestion(search: (q: string) => Promise<MentionOption[]>): MentionOptions["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => search(query),
    render: () => {
      let renderer: ReactRenderer<MentionListHandle, ComponentProps<typeof MentionList>> | null = null;

      const place = (props: Props) => {
        const rect = props.clientRect?.();

        const el = renderer?.element as HTMLElement | undefined;

        if (!rect || !el) return;

        Object.assign(el.style, { position: "fixed", left: `${Math.min(rect.left, window.innerWidth - 300)}px`, top: `${rect.bottom + 6}px`, zIndex: "60" });
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
