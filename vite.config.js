import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    base: "sky_stairs",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
