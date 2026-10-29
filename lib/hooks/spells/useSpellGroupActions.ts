import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  useRemoveAllSpellsFromGroup,
  useRenameSpellGroup,
} from "./useSpells";

import { useConfirm } from "@/lib/hooks/common";

interface UseSpellGroupActionsProps {
  campaignId: string;
  groupName: string;
  groupId?: string;
}

export function useSpellGroupActions({
  campaignId,
  groupName,
  groupId,
}: UseSpellGroupActionsProps) {
  const t = useTranslations("spells.groupActions");

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  const [newGroupName, setNewGroupName] = useState(groupName);

  const renameGroupMutation = useRenameSpellGroup(campaignId);

  const removeAllSpellsMutation = useRemoveAllSpellsFromGroup(campaignId);

  const confirm = useConfirm();

  const handleRenameGroup = useCallback(() => {
    if (!groupId || !newGroupName.trim()) return;

    renameGroupMutation.mutate(
      {
        groupId,
        name: newGroupName,
      },
      {
        onSuccess: () => {
          setRenameDialogOpen(false);
          setNewGroupName(groupName);
        },
      }
    );
  }, [groupId, newGroupName, groupName, renameGroupMutation]);

  const confirmRemoveAll = useCallback(
    () =>
      groupId
        ? confirm({
            title: t("removeAllTitle"),
            description: t("removeAllDescription", { group: groupName }),
            confirmLabel: t("removeAllConfirm"),
            destructive: true,
            onConfirm: () => removeAllSpellsMutation.mutateAsync(groupId),
          })
        : Promise.resolve(false),
    [confirm, groupId, groupName, removeAllSpellsMutation, t],
  );

  const openRenameDialog = useCallback(() => {
    setNewGroupName(groupName);
    setRenameDialogOpen(true);
  }, [groupName]);

  const closeRenameDialog = useCallback(() => {
    setRenameDialogOpen(false);
    setNewGroupName(groupName);
  }, [groupName]);

  return {
    dialogs: {
      rename: { open: renameDialogOpen, setOpen: setRenameDialogOpen },
    },
    state: { newGroupName, setNewGroupName },
    handlers: {
      handleRenameGroup,
      confirmRemoveAll,
      openRenameDialog,
      closeRenameDialog,
    },
    pending: {
      isRenaming: renameGroupMutation.isPending,
      isRemoving: removeAllSpellsMutation.isPending,
    },
  };
}
