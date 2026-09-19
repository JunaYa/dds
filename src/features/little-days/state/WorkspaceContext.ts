import { createContext } from "react";
import type { useWorkspaceState } from "../hooks/useWorkspaceState";

export const WorkspaceContext = createContext<ReturnType<typeof useWorkspaceState> | null>(null);
