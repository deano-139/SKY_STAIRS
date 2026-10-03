import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves from /SKY_STAIRS/, but Capacitor's WebView serves from /.
  // Build with `--mode capacitor` to get root-based paths for the APK.
  base: mode === "capacitor" ? "/" : "/SKY_STAIRS/",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
}));