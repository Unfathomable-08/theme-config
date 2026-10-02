import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      exclude: ["src/main.ts"],
    }),
  ],

  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "ThemeKit",
      formats: ["es", "cjs"],
      fileName: (format) => `theme-config.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {},
    sourcemap: true,
    emptyOutDir: true,
  },
});
