import * as path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json";

const dependencies = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    exclude: ["vue-demi"],
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "lib/index.ts"),
      name: "MyLib",
    },
    rollupOptions: {
      external: dependencies,
      output: {
        globals: Object.fromEntries(dependencies.map((d) => [d, d])),
      },
    },
  },
});
