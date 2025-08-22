import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5179, // <-- GARANTA QUE ESTE VALOR SEJA 5174
    strictPort: true,
    open: false,
    cors: true,
    hmr: {
      host: "10.10.2.141",
    },
  },
});
