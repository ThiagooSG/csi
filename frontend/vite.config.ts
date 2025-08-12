/* import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173, 
  },
});

export default {
  server: {
    host: true,
    port: 5173,
  },
};
*/
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true, // Escuta em todas as interfaces (0.0.0.0)
    port: 5174, // Porta padrão do Vite
    strictPort: true, // Garante que a porta não será alterada se estiver ocupada
    open: false, // Não abre o navegador automaticamente
    cors: true, // Habilita CORS (útil se for consumir de outro frontend)
    hmr: {
      host: "10.10.2.141", // IP da máquina local para Hot Module Replacement
    },
  },
});