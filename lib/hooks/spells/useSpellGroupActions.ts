import { useCallback, useState } from "react";

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

/**
 * Хук для управління діями з групами заклинань
 */
export function useSpellGroupActions({
  campaignId,
  groupName,
  groupId,
}: UseSpellGroupActionsProps) {
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
            title: "Видалити всі заклинання з групи?",
            description: `Ви впевнені, що хочете видалити всі заклинання з групи "${groupName}"? Заклинання не будуть видалені, але вони втратять зв'язок з цією групою.`,
            confirmLabel: "Видалити всі з групи",
            destructive: true,
            onConfirm: () => removeAllSpellsMutation.mutateAsync(groupId),
          })
        : Promise.resolve(false),
    [confirm, groupId, groupName, removeAllSpellsMutation],
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
