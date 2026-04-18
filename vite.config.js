import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const base = env.VITE_BASE_PATH || "/";

  return {
    plugins: [react()],
    base,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/") ||
              id.includes("/react-router/") ||
              id.includes("/react-router-dom/")
            ) {
              return "framework";
            }

            if (id.includes("/@supabase/")) {
              return "supabase";
            }

            if (id.includes("/@stripe/")) {
              return "payments";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
