import path from "path";
import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    webExtension({
      manifest: "manifest.json",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
  },
});
