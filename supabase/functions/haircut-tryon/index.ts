import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { faceImage, haircutTitle, haircutDetail, hairColor, hairType } = await req.json();
    if (!faceImage || typeof faceImage !== "string" || !faceImage.startsWith("data:")) {
      return new Response(JSON.stringify({ error: "faceImage data URL is required" }), {
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

    const colorDesc =
      hairColor === "ranger"
        ? "vivid bright orange-and-magenta fashion color"
        : hairColor
        ? `${hairColor} hair color`
        : "their natural hair color";

    const prompt = `Edit this photo of a person. KEEP the person's face, skin tone, eye color, jawline, identity and all facial features EXACTLY the same — do not change their face at all. ONLY restyle their hair so they are wearing a stylish, currently trending men's "${haircutTitle}" haircut. ${haircutDetail ?? ""} The hair should be ${colorDesc}${hairType ? `, suited for ${hairType} hair type` : ""}. Keep the original lighting, framing, clothing and background the same. Photorealistic magazine-quality result. No text, no watermarks, no logos.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: faceImage } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("haircut-tryon gateway error:", res.status, t);
      const status = res.status === 429 ? 429 : res.status === 402 ? 402 : 500;
      const msg =
        res.status === 429
          ? "Too many try-on requests. Please wait a moment."
          : res.status === 402
          ? "AI credits required for try-on."
          : "Couldn't generate the try-on image.";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const imageUrl =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("haircut-tryon error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
