import type { Resume, Settings } from "@applyhawk/core";
import { createContext } from "react";
import type { ReactNode } from "react";
import { useStorage } from "../hooks/useStorage";

interface StorageContextValue {
  resume: Resume | null;
  settings: Settings;
  isLoaded: boolean;
  updateResume: (resume: Partial<Resume>) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const StorageContext = createContext<StorageContextValue>(null!);

export function StorageProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();

  if (!storage.isLoaded) {
    return null;
  }

  return (
    <StorageContext.Provider value={storage}>
      {children}
    </StorageContext.Provider>
  );
}
