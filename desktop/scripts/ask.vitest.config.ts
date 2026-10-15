// ask:samples koşucusu (scripts/ask-samples.run.ts). Normal test koşusundan ayrı.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/ask-samples.run.ts"],
    reporters: ["dot"],
  },
});
