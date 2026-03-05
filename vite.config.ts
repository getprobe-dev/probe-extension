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
  build: {
    outDir: "dist",
  },
});
