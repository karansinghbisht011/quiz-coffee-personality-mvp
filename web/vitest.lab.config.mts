import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The scoring lab: slow experiments that compare scoring variants. Run with `npm run lab`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["tests/lab/**/*.lab.ts"], testTimeout: 3_600_000 },
});
