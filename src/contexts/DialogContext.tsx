import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DialogType = 'create-run' | 'settings' | null;

interface DialogContextType {
  activeDialog: DialogType;
  openDialog: (dialog: DialogType) => void;
  closeDialog: () => void;
  isDialogOpen: (dialog: DialogType) => boolean;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  const openDialog = (dialog: DialogType) => {
    setActiveDialog(dialog);
  };

  const closeDialog = () => {
    setActiveDialog(null);
  };

  const isDialogOpen = (dialog: DialogType) => {
    return activeDialog === dialog;
  };

  const value: DialogContextType = {
    activeDialog,
    openDialog,
    closeDialog,
    isDialogOpen,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
