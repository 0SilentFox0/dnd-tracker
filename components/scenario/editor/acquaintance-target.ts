import type { Editor } from "@tiptap/core";

export type AcquaintanceDialogTarget =
  | { mode: "create"; name: string; pageId: string; sectionId: string }
  | { mode: "edit"; id: string; pageId: string; sectionId: string };

export function acquaintanceTargetFor(editor: Editor, where: { pageId: string; sectionId: string }): { target: AcquaintanceDialogTarget; range: { from: number; to: number } } {
  const { from, to } = editor.state.selection;

  if (editor.isActive("mention", { type: "acquaintance" })) {
    return { target: { mode: "edit", id: String(editor.getAttributes("mention").id), ...where }, range: { from, to } };
  }

  return { target: { mode: "create", name: editor.state.doc.textBetween(from, to, " ").trim(), ...where }, range: { from, to } };
}
