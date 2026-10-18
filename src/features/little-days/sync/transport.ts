import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { validateState, canonical } from "./engine";
import type { SyncState } from "./schema";
import type { Provider } from "./providers";
export type { Provider } from "./providers";
export const statusSchema = z.object({ configured: z.boolean(), connected: z.boolean(), account: z.string().optional(), expiresAt: z.number().optional() });
export async function cloudStatus(provider: Provider) { return statusSchema.parse(await invoke("plugin:cloud-sync|status", { provider })); }
export async function pull(provider: Provider, account: string) {
  const response = z.object({ account: z.string(), snapshots: z.array(z.string().max(20 * 1024 * 1024)).max(1000) }).parse(await invoke("plugin:cloud-sync|pull", { provider, account }));
  if (response.account !== account) throw Error("Cloud account changed. Reconnect to continue");
  return response.snapshots.map(text => validateState(JSON.parse(text)));
}
export async function push(provider: Provider, account: string, state: SyncState) {
  await invoke("plugin:cloud-sync|push", { provider, account, content: canonical(state) });
}

const authorizationSchema = z.object({ url: z.url(), expiresAt: z.number().positive() });
export async function beginAuthorization(provider: Provider) {
  return authorizationSchema.parse(await invoke("plugin:cloud-sync|begin_auth", { provider }));
}
export async function pollAuthorization(provider: Provider) {
  return z.boolean().parse(await invoke("plugin:cloud-sync|poll_auth", { provider }));
}
export async function disconnectProvider(provider: Provider) {
  await invoke("plugin:cloud-sync|disconnect", { provider });
}
