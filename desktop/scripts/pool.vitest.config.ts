// pool:check / pool:coverage koşucusu (scripts/pool-check.run.ts). Normal test koşusundan ayrı.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/pool-check.run.ts"],
    reporters: ["dot"],
  },
});
