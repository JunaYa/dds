import type { ReactNode } from "react";
import { useWorkspaceState } from "../hooks/useWorkspaceState";
import { WorkspaceContext } from "./WorkspaceContext";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  return <WorkspaceContext.Provider value={state}>{children}</WorkspaceContext.Provider>;
}
