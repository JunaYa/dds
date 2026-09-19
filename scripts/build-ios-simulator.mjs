import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Tauri's unsigned simulator export cannot replace an existing .app directory.
const config = JSON.parse(
  await readFile(
    new URL("../src-tauri/tauri.conf.json", import.meta.url),
    "utf8",
  ),
);
const artifact = new URL(
  `../src-tauri/gen/apple/build/arm64-sim/${encodeURIComponent(config.productName)}.app`,
  import.meta.url,
);
await rm(artifact, { recursive: true }).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "tauri",
    "ios",
    "build",
    "--debug",
    "--target",
    "aarch64-sim",
    "--no-sign",
    "--ci",
  ],
  { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
