import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://qxdhhuwyalzaivkykxgs.supabase.co"),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZGhodXd5YWx6YWl2a3lreGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzU4ODUsImV4cCI6MjA4NTE1MTg4NX0.5sG-68UylAHUDs1ZSp-FlNiNfcDzgfEFVDKO9dEY9vc"),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify("qxdhhuwyalzaivkykxgs"),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
