import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fault mapping dictionary for common terms
const faultMappings: Record<string, string> = {
  "pikap": "Error de Pick-up",
  "pick up": "Error de Pick-up",
  "no agarra": "Error de Pick-up",
  "no levanta": "Error de Pick-up",
  "pasta": "Insuficiencia de Soldadura",
  "poca pasta": "Insuficiencia de Soldadura",
  "falta pasta": "Insuficiencia de Soldadura",
  "puente": "Puente de Soldadura",
  "corto": "Puente de Soldadura",
  "bridge": "Puente de Soldadura",
  "desplazado": "Componente Desplazado",
  "torcido": "Componente Desplazado",
  "movido": "Componente Desplazado",
  "faltante": "Componente Faltante",
  "missing": "Componente Faltante",
  "tombstone": "Defecto de Tombstone",
  "manhattan": "Defecto de Tombstone",
  "parado": "Defecto de Tombstone",
  "fria": "Pasta Fría",
  "cold": "Pasta Fría",
  "vision": "Error de Visión",
  "camara": "Error de Visión",
  "no ve": "Error de Visión",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, machineType } = await req.json();
    const lowerText = text.toLowerCase();

    // Try local mapping first
    for (const [keyword, classification] of Object.entries(faultMappings)) {
      if (lowerText.includes(keyword)) {
        return new Response(
          JSON.stringify({ classification, isUnknown: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If no local match, try Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Eres un clasificador de fallas de manufactura SMT. Mapea términos coloquiales o Spanglish a fallas técnicas estandarizadas. Responde SOLO con el nombre de la falla clasificada, sin explicación. Tipos comunes: Error de Pick-up, Insuficiencia de Soldadura, Puente de Soldadura, Componente Desplazado, Componente Faltante, Defecto de Tombstone, Pasta Fría, Error de Visión. Si no puedes clasificar, responde "Falla Pendiente de Clasificación".`
            },
            { role: "user", content: `Clasifica esta falla (equipo: ${machineType}): "${text}"` }
          ],
        }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const classification = data.choices?.[0]?.message?.content?.trim() || "Falla Pendiente de Clasificación";
        const isUnknown = classification.includes("Pendiente");
        
        return new Response(
          JSON.stringify({ classification, isUnknown }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback
    return new Response(
      JSON.stringify({ classification: "Falla Pendiente de Clasificación", isUnknown: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
