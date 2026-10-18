import { createContext, useContext } from "react";
import type { Provider } from "./transport";
export type Binding = { provider: Provider; account: string };
export type SyncController = {
  binding: Binding | null; busy: boolean; error: string; lastSync: string;
  enable: (provider: Provider) => Promise<void>; disable: () => void; sync: () => Promise<void>;
  resolve: (choices: Record<string, string>, local?: boolean) => Promise<void>;
};
export const SyncContext = createContext<SyncController | null>(null);
export function useCloudSync() {
  const value = useContext(SyncContext);
  if (!value) throw Error("Cloud sync provider is missing");
  return value;
}
