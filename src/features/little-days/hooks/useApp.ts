import { useContext } from "react";
import { WorkspaceContext } from "../state/WorkspaceContext";

export function useApp() {
  const state = useContext(WorkspaceContext);
  if (!state) throw new Error("Little days requires WorkspaceProvider");
  return state;
}
