import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHairProfile, useSaveHairProfile } from "@/hooks/useHairProfile";
import { useProducts, Product } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Scissors, Sparkles, Plus } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const HAIR_TYPES = ["straight", "wavy", "curly", "coily"];
const TEXTURES = ["fine", "medium", "coarse"];
const THICKNESS = ["thin", "medium", "thick"];
const DENSITY = ["low", "medium", "high"];
const SCALP = ["oily", "balanced", "dry"];
const HAIR_COLORS = ["black", "brown", "blonde", "red", "ranger"];
const CONCERNS = ["oily", "dry", "dandruff", "frizz", "damage", "color-treated", "scalp", "volume"];

const STEP_COPY: Record<string, { title: string; description: string }> = {
  shampoo: { title: "Cleanse", description: "Massage into wet scalp to lift product and excess oil." },
  conditioner: { title: "Condition", description: "Work through mid-lengths to ends to soften and detangle." },
  "leave-in": { title: "Prep & hydrate", description: "Apply to damp lengths to smooth cuticles and boost softness." },
  mask: { title: "Treat", description: "Once a week, leave on 5–10 minutes for deep nourishment." },
  oil: { title: "Seal & shine", description: "A few drops on ends to lock in moisture and add gloss." },
  cream: { title: "Define", description: "Apply with praying hands, then scrunch for definition." },
  mousse: { title: "Build volume", description: "Rake through roots for light, airy texture." },
  gel: { title: "Hold", description: "Smooth on for crunch-free hold and shape memory." },
  spray: { title: "Refresh & texture", description: "Mist and scrunch to revive shape between washes." },
  clay: { title: "Shape & control", description: "Emulsify between palms and sculpt with matte hold." },
  pomade: { title: "Style & polish", description: "Warm a small amount and shape for a sleeker finish." },
  powder: { title: "Boost texture", description: "Tap at roots for instant lift and grip." },
  styling: { title: "Style", description: "Shape and finish for the look you want." },
  default: { title: "Apply", description: "Work through hair as the final styling step." },
};

function stepFor(product: Product, index: number) {
  const cat = product.category?.toLowerCase() ?? "";
  for (const key of Object.keys(STEP_COPY)) {
    if (cat.includes(key)) return STEP_COPY[key];
  }
  const slug = product.slug?.toLowerCase() ?? "";
  for (const key of Object.keys(STEP_COPY)) {
    if (slug.includes(key)) return STEP_COPY[key];
  }
  return STEP_COPY.default;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}

export default function Recommender() {
  const { user } = useAuth();
  const { data: existing } = useHairProfile();
  const saveProfile = useSaveHairProfile();
  const { data: products = [] } = useProducts();
  const { add } = useCart();

  const [hairType, setHairType] = useState("");
  const [texture, setTexture] = useState("");
  const [thickness, setThickness] = useState("");
  const [density, setDensity] = useState("");
  const [scalpType, setScalpType] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [loadingTip, setLoadingTip] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [haircutImage, setHaircutImage] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (existing) {
      setHairType(existing.hair_type ?? "");
      setTexture(existing.texture ?? "");
      setThickness(existing.thickness ?? "");
      setDensity(existing.density ?? "");
      setScalpType(existing.scalp_type ?? "");
      setHairColor(existing.hair_color ?? "");
      setConcerns(existing.concerns ?? []);
    }
  }, [existing]);

  const toggleConcern = (c: string) =>
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const recommendations = useMemo(() => {
    if (!hairType) return [];
    const scored = products.map((p) => {
      let score = 0;
      if (p.hair_types?.includes(hairType)) score += 3;
      const concernOverlap = (p.concerns ?? []).filter(
        (c) =>
          concerns.includes(c) ||
          (scalpType === "oily" && c === "oily") ||
          (scalpType === "dry" && c === "dry")
      ).length;
      score += concernOverlap * 2;
      return { p, score };
    });
    const base = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.p);
    // Fallback so users always get 5 steps
    const need = 5 - base.length;
    if (need > 0) {
      const extras = products.filter((p) => !base.find((b) => b.id === p.id)).slice(0, need);
      return [...base, ...extras].slice(0, 5);
    }
    return base.slice(0, 5);
  }, [products, hairType, concerns, scalpType]);

  const haircutSuggestion = useMemo(() => {
    if (hairColor === "ranger") {
      return { title: "Bold razor wolf cut", detail: "Choppy layers highlight statement color and boost movement." };
    }
    switch (hairType) {
      case "straight":
        return { title: "Blunt lob", detail: "Clean edges maximize shine and thickness." };
      case "wavy":
        return { title: "Soft long layers", detail: "Enhances waves without removing body." };
      case "curly":
        return { title: "Rounded curl shape", detail: "Keeps volume balanced while defining coils." };
      case "coily":
        return { title: "Tapered shape-up", detail: "Maintains length on top with neat sides." };
      default:
        return { title: "Textured fringe", detail: "A versatile shape that suits most textures." };
    }
  }, [hairType, hairColor]);

  const handleGenerate = async () => {
    if (!hairType) {
      toast.error("Pick your hair type first");
      return;
    }
    setLoadingTip(true);
    setHaircutImage(null);
    try {
      if (user) {
        await saveProfile.mutateAsync({
          hair_type: hairType || null,
          hair_color: hairColor || null,
          texture: texture || null,
          thickness: thickness || null,
          density: density || null,
          scalp_type: scalpType || null,
          concerns,
        });
      }
      setHasGenerated(true);
      const { data, error } = await supabase.functions.invoke("hair-recommend", {
        body: {
          hairType,
          hairColor,
          haircutTitle: haircutSuggestion.title,
          haircutDetail: haircutSuggestion.detail,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) setHaircutImage(data.imageUrl);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate the haircut image — your matches are still below.");
    } finally {
      setLoadingTip(false);
    }
  };

  const handleExportPoster = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(posterRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const { width, height } = pdf.internal.pageSize;
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidth = width;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      const y = Math.max((height - imgHeight) / 2, 0);
      pdf.addImage(dataUrl, "PNG", 0, y, imgWidth, imgHeight);
      pdf.save("lushlocks-routine.pdf");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't export the poster.");
    } finally {
      setExporting(false);
    }
  };

  const handleAddToCart = (p: Product) => {
    add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url });
    toast.success(`${p.name} added to bag`);
  };

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-3">
            <Sparkles className="w-3 h-3 text-primary" /> Hair survey
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Find your routine</h1>
          <p className="text-muted-foreground mt-2">Tell us about your hair — we’ll build a 5-step routine with your matched products.</p>
        </div>

        <div className="bg-card p-6 sm:p-8 rounded-3xl space-y-6">
          {[
            { label: "Hair type", value: hairType, set: setHairType, options: HAIR_TYPES },
            { label: "Strand texture", value: texture, set: setTexture, options: TEXTURES },
            { label: "Thickness", value: thickness, set: setThickness, options: THICKNESS },
            { label: "Density (how much hair)", value: density, set: setDensity, options: DENSITY },
            { label: "Scalp", value: scalpType, set: setScalpType, options: SCALP },
            { label: "Hair color", value: hairColor, set: setHairColor, options: HAIR_COLORS },
          ].map((f) => (
            <div key={f.label}>
              <Label className="text-sm font-medium">{f.label}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {f.options.map((o) => (
                  <Pill key={o} active={f.value === o} onClick={() => f.set(f.value === o ? "" : o)}>{o}</Pill>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label className="text-sm font-medium">Concerns (pick any)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CONCERNS.map((c) => (
                <Pill key={c} active={concerns.includes(c)} onClick={() => toggleConcern(c)}>{c}</Pill>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            onClick={handleGenerate}
            disabled={loadingTip}
          >
            {loadingTip ? "Building your routine…" : "Save & get my routine"}
          </Button>
        </div>

        {hasGenerated && (
          <div className="mt-8 space-y-6">
            <div className="bg-card p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your routine</p>
                  <h2 className="font-display text-2xl font-bold mt-1">Your 5-step routine</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleExportPoster}
                  disabled={exporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exporting ? "Exporting…" : "Export PDF poster"}
                </Button>
              </div>

              <div className="grid gap-3">
                {recommendations.map((p, i) => {
                  const step = stepFor(p, i);
                  return (
                    <div key={p.id} className="flex items-start gap-4 bg-muted/50 rounded-2xl p-4">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {i + 1}
                      </div>
                      <Link to={`/shop/${p.slug}`} className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-background">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold">{step.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Link to={`/shop/${p.slug}`} className="text-sm font-medium hover:text-primary transition-colors">
                            {p.name}
                          </Link>
                          <span className="text-xs text-muted-foreground capitalize">· {p.category}</span>
                          <span className="text-sm">· ${Number(p.price).toFixed(2)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0"
                        onClick={() => handleAddToCart(p)}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card p-6 rounded-3xl">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                <Scissors className="w-4 h-4 text-primary" /> Haircut suggestion
              </div>
              <div className="grid sm:grid-cols-[1fr_180px] gap-4 mt-3 items-start">
                <div>
                  <h3 className="font-display text-xl font-bold">{haircutSuggestion.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{haircutSuggestion.detail}</p>
                  {hairColor && (
                    <p className="text-xs text-muted-foreground mt-2 capitalize">
                      Rendered with {hairColor} {hairType} hair
                    </p>
                  )}
                </div>
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted relative">
                  {haircutImage ? (
                    <img src={haircutImage} alt={haircutSuggestion.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      {loadingTip ? "Generating…" : "No image"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card p-4 sm:p-6 rounded-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">Poster preview</p>
              <div
                ref={posterRef}
                className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 space-y-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-slate-300">lushlocks routine</p>
                    <h3 className="text-2xl font-bold mt-2">Your custom hair plan</h3>
                    <p className="text-sm text-slate-300 mt-2">
                      {hairType && <span className="capitalize">{hairType}</span>} {texture && <>• {texture} texture</>} {hairColor && <>• {hairColor} color</>}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-[0.2em]">AI matched</div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-300">5-step routine</p>
                    <ol className="mt-3 space-y-2 text-sm">
                      {recommendations.map((p, i) => {
                        const step = stepFor(p, i);
                        return (
                          <li key={p.id} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">{i + 1}</span>
                            <div>
                              <p className="font-semibold">{step.title}</p>
                              <p className="text-xs text-slate-300">{p.name}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Haircut suggestion</p>
                      <p className="text-lg font-semibold mt-2">{haircutSuggestion.title}</p>
                      <p className="text-xs text-slate-300 mt-2">{haircutSuggestion.detail}</p>
                    </div>
                    {haircutImage && (
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/10">
                        <img src={haircutImage} alt={haircutSuggestion.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
