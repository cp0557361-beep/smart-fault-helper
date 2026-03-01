import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[DEBUG] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("[DEBUG] VITE_SUPABASE_PUBLISHABLE_KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "SET" : "MISSING");
console.log("[DEBUG] All VITE_ env keys:", Object.keys(import.meta.env).filter(k => k.startsWith("VITE_")));

createRoot(document.getElementById("root")!).render(<App />);
