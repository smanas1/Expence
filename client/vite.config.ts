import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",
    port: 3000,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
