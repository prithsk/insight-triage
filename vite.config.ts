import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the dependencies that never change from the app code that
         * changes every deploy, so a returning visitor re-downloads only what
         * was actually rebuilt. Route-level splitting lives in `src/App.tsx`;
         * this is the vendor half of the same job.
         *
         * Deliberately coarse. Fine-grained manual chunks are how you get
         * module-initialisation-order bugs that only appear in production, and
         * the entry chunk is dominated by these three groups anyway. React and
         * the router go together because the router cannot initialise without
         * React already evaluated.
         */
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
}));
