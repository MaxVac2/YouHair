import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hairType, hairColor, haircutTitle, haircutDetail } = await req.json();
    if (!haircutTitle) {
      return new Response(JSON.stringify({ error: "haircutTitle is required" }), {
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

    const colorDescriptor =
      hairColor === "ranger"
        ? "vivid bold fashion color (mix of bright orange and magenta)"
        : hairColor
        ? `${hairColor} hair color`
        : "natural hair color";

    const typeDescriptor = hairType ? `${hairType} hair texture` : "natural hair texture";

    const prompt = `Studio portrait photograph of a person showcasing a "${haircutTitle}" hairstyle. ${haircutDetail ?? ""}. Hair shown clearly with ${typeDescriptor} and ${colorDescriptor}. Clean neutral light-gray background, soft professional salon lighting, sharp focus on the hair, front and slight 3/4 angle, magazine editorial quality. No text, no watermark.`;

    const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!imgRes.ok) {
      if (imgRes.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (imgRes.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await imgRes.text();
      console.error("Image gateway error:", imgRes.status, t);
      throw new Error("Image gateway error");
    }

    const data = await imgRes.json();
    const b64 = data?.data?.[0]?.b64_json;
    const imageUrl = b64 ? `data:image/png;base64,${b64}` : null;

    return new Response(JSON.stringify({ imageUrl }), {
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
