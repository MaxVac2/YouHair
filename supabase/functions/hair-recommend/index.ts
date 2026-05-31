import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      hairType,
      hairColor,
      texture,
      thickness,
      density,
      scalpType,
      concerns,
      haircutTitle,
      haircutDetail,
    } = await req.json();

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

    const parts: string[] = [];
    if (hairType) parts.push(`${hairType} hair type`);
    if (texture) parts.push(`${texture} strand texture`);
    if (thickness) parts.push(`${thickness} thickness`);
    if (density) parts.push(`${density} density`);
    if (scalpType) parts.push(`${scalpType} scalp`);
    if (Array.isArray(concerns) && concerns.length > 0) parts.push(`hair concerns: ${concerns.join(", ")}`);
    parts.push(colorDescriptor);

    const prompt = `Professional studio portrait photograph of a MAN with a "${haircutTitle}" men's hairstyle. ${haircutDetail ?? ""}. Show the man's hair and face clearly. Attributes: ${parts.join("; ")}. Clean neutral light-gray background, soft professional barbershop/salon lighting, sharp focus on the hair, front and slight 3/4 angle, magazine editorial quality. Masculine men's haircut only. No text, no watermark, no logos.`;

    const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!imgRes.ok) {
      const t = await imgRes.text();
      console.error("Image gateway error:", imgRes.status, t);
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
      throw new Error("Image gateway error");
    }

    const data = await imgRes.json();
    // Gemini via chat-completions returns images inside message.images[0].image_url.url
    const msg = data?.choices?.[0]?.message;
    const imageUrl: string | null =
      msg?.images?.[0]?.image_url?.url ??
      (data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);

    if (!imageUrl) {
      console.error("No image returned:", JSON.stringify(data).slice(0, 500));
    }

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
