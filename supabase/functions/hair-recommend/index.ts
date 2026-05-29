import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hairType, texture, thickness, density, scalpType, hairColor, concerns = [], productNames = [] } = await req.json();
    if (!hairType) {
      return new Response(JSON.stringify({ error: "hairType is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userInfo = [
      `Hair type: ${hairType}`,
      texture && `Strand texture: ${texture}`,
      thickness && `Thickness: ${thickness}`,
      density && `Density: ${density}`,
      scalpType && `Scalp: ${scalpType}`,
      hairColor && `Hair color: ${hairColor}`,
      concerns.length && `Concerns: ${concerns.join(", ")}`,
      productNames.length && `Recommended products from our catalog: ${productNames.join(", ")}`,
    ].filter(Boolean).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a warm, expert haircare advisor for the YouHair brand. Write a short personalized routine (3-5 sentences). Cover wash frequency, the key step type (cleanse, condition, mask, oil, leave-in) most important for them, and one styling tip. Be specific, friendly, and avoid medical claims. Reference the listed catalog products by name when it fits naturally. If hair color is ranger, always include Hair Die in the routine. Plain text, no markdown headings.",
          },
          { role: "user", content: userInfo },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const advice = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hair-recommend error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
