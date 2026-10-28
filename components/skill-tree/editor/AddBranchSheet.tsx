import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export function AddBranchSheet({ open, branches, actions }: {
  open: boolean;
  branches: Array<{ id: string; name: string; color: string }>;
  actions: { onClose: () => void; onAdd: (id: string) => void; onCreate: (input: { name: string; color: string }) => Promise<boolean> };
}) {
  const [name, setName] = useState("");

  const [color, setColor] = useState("#8a6414");

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={(o) => !o && actions.onClose()}
      title="Додати гілку"
      footer={<Button form="new-branch" type="submit" disabled={!name.trim()}>Створити нову</Button>}
    >
      <div className="flex flex-col gap-1">
        {branches.map((b) => (
          <Button key={b.id} type="button" variant="ghost" className="justify-start gap-2" onClick={() => actions.onAdd(b.id)}>
            <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
            {b.name}
          </Button>
        ))}
      </div>
      <form
        id="new-branch"
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();

          if (await actions.onCreate({ name: name.trim(), color })) setName("");
        }}
      >
        <Input placeholder="Назва нової гілки" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" aria-label="Колір" value={color} onChange={(e) => setColor(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
