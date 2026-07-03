import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Config alineada con Tauri: puerto fijo 1420, sin ofuscar errores del server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    host: true, // escucha en todas las interfaces (necesario para acceder vía Tailscale/LAN)
    port: 1420,
    strictPort: true,
    // Vite rechaza por defecto Host headers desconocidos (protección DNS-rebinding);
    // sin esto, acceder por el hostname de Tailscale (*.ts.net o el nombre de máquina) da 403.
    allowedHosts: true,
    watch: {
      // src-tauri lo vigila el CLI de Tauri, no Vite.
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
