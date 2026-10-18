import { expect, it } from "vitest";
import { availableProviders, providerDefinition, providerSchema } from "./providers";

it("offers cross-platform Alipan alongside iCloud on iOS", () => {
  expect(availableProviders(true)).toEqual(["icloud", "alipan"]);
  expect(availableProviders(false)).toEqual(["alipan"]);
  expect(providerDefinition("icloud").authorization).toBe("system");
  expect(providerDefinition("alipan").authorization).toBe("qr");
});
it("only accepts registered providers, including for persisted bindings", () => {
  for (const id of ["icloud", "alipan"]) expect(providerSchema.parse(id)).toBe(id);
  for (const id of ["unknown", "__proto__", "toString", "", null, {}]) {
    expect(providerSchema.safeParse(id).success).toBe(false);
  }
});
