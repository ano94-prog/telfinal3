import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const isDevOnReplit = process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

let cartographerPlugin: any = null;
if (isDevOnReplit) {
  try {
    const cartographerModule = require("@replit/vite-plugin-cartographer");
    cartographerPlugin = cartographerModule.cartographer();
  } catch (e) {
  }
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(cartographerPlugin ? [cartographerPlugin] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "client"),
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    allowedHosts: true,
  },
});
