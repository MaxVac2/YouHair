import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductInput {
  id: string;
  name: string;
  category: string;
  slug: string;
}

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
      products,
    } = await req.json();

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

    const attributes: string[] = [];
    if (hairType) attributes.push(`${hairType} hair type`);
    if (texture) attributes.push(`${texture} strand texture`);
    if (thickness) attributes.push(`${thickness} thickness`);
    if (density) attributes.push(`${density} density`);
    if (scalpType) attributes.push(`${scalpType} scalp`);
    if (Array.isArray(concerns) && concerns.length > 0) attributes.push(`hair concerns: ${concerns.join(", ")}`);
    attributes.push(colorDescriptor);
    const attrStr = attributes.join("; ");

    const productList: ProductInput[] = Array.isArray(products) ? products : [];

    // === ROUTINE GENERATION (structured JSON via tool calling) ===
    const routinePromise = (async () => {
      if (productList.length === 0) return { steps: [] };
      const productLines = productList
        .map((p, i) => `${i + 1}. ${p.name} (category: ${p.category})`)
        .join("\n");

      const tools = [
        {
          type: "function",
          function: {
            name: "build_routine",
            description: "Return a personalised hair routine with one step per provided product, in order.",
            parameters: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      product_id: { type: "string", description: "The id of the product this step uses" },
                      title: { type: "string", description: "Short action title, e.g. 'Cleanse', 'Define curls'" },
                      description: { type: "string", description: "1-2 sentence personalised instruction tailored to the user's attributes" },
                    },
                    required: ["product_id", "title", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["steps"],
              additionalProperties: false,
            },
          },
        },
      ];

      const messages = [
        {
          role: "system",
          content:
            "You are a senior men's hairstylist building personalised haircare routines. Every step must reference the exact product the user owns and tailor the instructions to their hair attributes. Keep descriptions concrete, warm, and under 30 words.",
        },
        {
          role: "user",
          content: `Build a step-by-step routine for a man with these attributes: ${attrStr}.\n\nUse these matched products IN ORDER (one step each):\n${productLines}\n\nInclude the product id verbatim for each step.`,
        },
      ];

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools,
          tool_choice: { type: "function", function: { name: "build_routine" } },
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Routine gateway error:", res.status, t);
        return { steps: [], routineError: res.status };
      }
      const data = await res.json();
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      try {
        const args = JSON.parse(toolCall?.function?.arguments ?? "{}");
        return { steps: args.steps ?? [] };
      } catch (e) {
        console.error("Routine parse error", e);
        return { steps: [] };
      }
    })();

    // === IMAGE GENERATION ===
    const imagePromise = (async () => {
      if (!haircutTitle) return null;
      const prompt = `Professional studio portrait photograph of a MAN with a "${haircutTitle}" men's hairstyle. ${haircutDetail ?? ""}. Show the man's hair and face clearly. Attributes: ${attrStr}. Clean neutral light-gray background, soft professional barbershop/salon lighting, sharp focus on the hair, front and slight 3/4 angle, magazine editorial quality. Masculine men's haircut only. No text, no watermark, no logos.`;

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
        console.error("Image gateway error:", imgRes.status, await imgRes.text());
        return null;
      }
      const data = await imgRes.json();
      const msg = data?.choices?.[0]?.message;
      return msg?.images?.[0]?.image_url?.url ?? null;
    })();

    const [routineResult, imageUrl] = await Promise.all([routinePromise, imagePromise]);

    return new Response(JSON.stringify({ imageUrl, steps: routineResult.steps }), {
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
