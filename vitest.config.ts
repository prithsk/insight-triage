import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/**/*.test.ts"],
    // Migration tests read SQL from disk and reason about cumulative policy
    // state. They are pure text analysis, no database connection required.
  },
});
