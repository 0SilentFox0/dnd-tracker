"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSpellGroup } from "@/lib/api/spells";

interface CreateGroupDialogProps {
  campaignId: string;
  onGroupCreated?: (groupId: string) => void;
}

export function CreateGroupDialog({
  campaignId,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const newGroup = await createSpellGroup(campaignId, {
        name: name.trim(),
      });

      setOpen(false);
      setName("");
      router.refresh();
      
      if (onGroupCreated) {
        onGroupCreated(newGroup.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка створення групи";

      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="whitespace-nowrap">
          + Створити групу заклинань
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Створити нову групу заклинань</DialogTitle>
          <DialogDescription>
            Групи заклинань дозволяють організувати заклинання та скіли
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Назва групи *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Назва групи"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName("");
                setError(null);
              }}
              disabled={isCreating}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? "Створення..." : "Створити групу"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
