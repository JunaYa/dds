import { z } from "zod";

interface ProviderDefinition {
  label: string;
  platforms: readonly ("ios" | "other")[];
  authorization: "system" | "qr";
  setupMessage: string;
  authorizationNote?: string;
  connectLabel: string;
  reconnectLabel: string;
  disconnectLabel: string;
  qrInstruction?: string;
  qrLabel?: string;
}

export const providers = {
  icloud: {
    label: "iCloud",
    platforms: ["ios"],
    authorization: "system",
    setupMessage: "iCloud container is not configured or unavailable",
    connectLabel: "Check iCloud again",
    reconnectLabel: "Check iCloud again",
    disconnectLabel: "",
  },
  alipan: {
    label: "Alipan",
    platforms: ["ios", "other"],
    authorization: "qr",
    setupMessage: "Alipan is not configured in this build. The developer must provide an approved public-client App ID.",
    authorizationNote: "Alipan authorization lasts 30 days. Reconnect when it expires; local records remain available.",
    connectLabel: "Connect Alipan",
    reconnectLabel: "Reconnect Alipan",
    disconnectLabel: "Disconnect Alipan",
    qrInstruction: "Scan with Alipan to authorize this app. This code expires in three minutes.",
    qrLabel: "Alipan authorization QR code",
  },
} satisfies Record<string, ProviderDefinition>;

export type Provider = keyof typeof providers;
export const providerSchema = z.custom<Provider>(
  value => typeof value === "string" && Object.hasOwn(providers, value),
  "Unknown cloud provider",
);
export function providerDefinition(id: Provider): ProviderDefinition { return providers[id]; }
export function availableProviders(ios: boolean): Provider[] {
  return (Object.keys(providers) as Provider[]).filter(id => providerDefinition(id).platforms.includes(ios ? "ios" : "other"));
}
