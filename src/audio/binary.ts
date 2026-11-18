export async function verifiedAudioBytes(data: string, sha256: string): Promise<Uint8Array<ArrayBuffer>> {
  if (data.length > 28 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid audio cache payload");
  const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error("Invalid audio cache payload");
  if (!crypto.subtle) throw new Error("Audio verification requires a secure browser context.");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== sha256) throw new Error("Audio checksum did not match.");
  return bytes;
}
