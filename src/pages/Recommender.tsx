import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useHairProfile, useSaveHairProfile } from "@/hooks/useHairProfile";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Scissors, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const HAIR_TYPES = ["straight", "wavy", "curly", "coily"];
const TEXTURES = ["fine", "medium", "coarse"];
const THICKNESS = ["thin", "medium", "thick"];
const DENSITY = ["low", "medium", "high"];
const SCALP = ["oily", "balanced", "dry"];
const HAIR_COLORS = ["black", "brown", "blonde", "red", "ranger"];
const CONCERNS = ["oily", "dry", "dandruff", "frizz", "damage", "color-treated", "scalp", "volume"];

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

type RoutineStep = {
  title: string;
  description: string;
  productName: string;
  category: string;
};

export default function Recommender() {
  const { user } = useAuth();
  const { data: existing } = useHairProfile();
  const saveProfile = useSaveHairProfile();
  const { data: products = [] } = useProducts();

  const [hairType, setHairType] = useState("");
  const [texture, setTexture] = useState("");
  const [thickness, setThickness] = useState("");
  const [density, setDensity] = useState("");
  const [scalpType, setScalpType] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [tip, setTip] = useState<string>("");
  const [loadingTip, setLoadingTip] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    const hairDie = products.find((p) => p.slug === "hair-die");
    const withColor = hairColor === "ranger" && hairDie
      ? [hairDie, ...base.filter((p) => p.id !== hairDie.id)]
      : base;
    return withColor.slice(0, 6);
  }, [products, hairType, concerns, scalpType, hairColor]);

  const routineSteps = useMemo(() => {
    const pickBySlug = (slug: string) =>
      recommendations.find((p) => p.slug === slug) || products.find((p) => p.slug === slug);
    const steps: RoutineStep[] = [];
    const used = new Set<string>();

    const addStep = (product: typeof products[number] | undefined, title: string, description: string) => {
      if (!product || used.has(product.id)) return;
      used.add(product.id);
      steps.push({ title, description, productName: product.name, category: product.category });
    };

    addStep(
      pickBySlug("leave-in-conditioner"),
      "Prep & hydrate",
      "Work through damp lengths to smooth cuticles and boost softness."
    );

    if (hairType === "curly" || hairType === "coily") {
      addStep(
        pickBySlug("curl-cream") ?? pickBySlug("curl-gel"),
        "Define your curls",
        "Apply with praying hands, then scrunch for clumps and definition."
      );
    } else if (hairType === "wavy") {
      addStep(
        pickBySlug("curl-mousse") ?? pickBySlug("sea-salt-spray"),
        "Build airy volume",
        "Rake through roots and scrunch for light, bouncy texture."
      );
    } else {
      addStep(
        pickBySlug("hair-clay") ?? pickBySlug("pomade"),
        "Shape & control",
        "Emulsify between palms and sculpt with flexible hold."
      );
    }

    addStep(
      pickBySlug("texture-powder") ?? pickBySlug("sea-salt-spray"),
      "Boost texture",
      "Target roots and mid-lengths for lift and grip."
    );

    if (hairType === "wavy" || hairType === "curly" || hairType === "coily") {
      addStep(
        pickBySlug("curl-refresh-spray"),
        "Refresh between wash days",
        "Mist and scrunch to revive shape without buildup."
      );
    }

    if (hairColor === "ranger") {
      addStep(
        pickBySlug("hair-die"),
        "Color refresh",
        "Apply for bold color payoff and even saturation."
      );
    }

    return steps;
  }, [products, recommendations, hairType, hairColor]);

  const haircutSuggestion = useMemo(() => {
    if (hairColor === "ranger") {
      return {
        title: "Bold razor wolf cut",
        detail: "Choppy layers highlight statement color and boost movement.",
      };
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
        return { title: "Soft layers", detail: "A versatile shape that suits most textures." };
    }
  }, [hairType, hairColor]);

  const handleGenerate = async () => {
    if (!hairType) {
      toast.error("Pick your hair type first");
      return;
    }
    setLoadingTip(true);
    setTip("");
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
      const { data, error } = await supabase.functions.invoke("hair-recommend", {
        body: {
          hairType,
          hairColor,
          texture,
          thickness,
          density,
          scalpType,
          concerns,
          productNames: recommendations.map((p) => p.name),
        },
      });
      if (error) throw error;
      setTip(data?.advice ?? "");
      setHasGenerated(true);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate routine — your matches are still below.");
      setHasGenerated(true);
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
      pdf.save("youhair-routine-poster.pdf");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't export the poster.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-3">
            <Sparkles className="w-3 h-3 text-primary" /> Hair survey
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Find your routine</h1>
          <p className="text-muted-foreground mt-2">Tell us about your hair — we’ll match products and build your routine.</p>
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
                  <h2 className="font-display text-2xl font-bold mt-1">Product routine</h2>
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
                {routineSteps.map((step, i) => (
                  <div key={step.title} className="flex items-start gap-4 bg-muted/50 rounded-2xl p-4">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                        <span className="font-medium">{step.productName}</span>
                        <span className="text-muted-foreground capitalize">{step.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card p-6 rounded-3xl">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                <Scissors className="w-4 h-4 text-primary" /> Haircut suggestion
              </div>
              <h3 className="font-display text-xl font-bold mt-2">{haircutSuggestion.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{haircutSuggestion.detail}</p>
            </div>

            {tip && (
              <div className="bg-primary/5 p-6 rounded-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="font-display font-semibold">Your personalized tip</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{tip}</p>
              </div>
            )}

            <div>
              <h2 className="font-display text-2xl font-bold mb-5">Your matches</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {recommendations.map((p) => (
                  <Link key={p.id} to={`/shop/${p.slug}`} className="group block">
                    <div className="aspect-square bg-muted rounded-3xl overflow-hidden mb-3">
                      {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{p.category}</p>
                    <h3 className="font-display font-semibold text-sm leading-tight mt-0.5 group-hover:text-primary transition-colors">{p.name}</h3>
                    <p className="text-sm mt-0.5">${Number(p.price).toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.concerns?.filter((c) => concerns.includes(c)).slice(0, 2).map((c) => (
                        <Badge key={c} variant="secondary" className="rounded-full text-[10px] capitalize">{c}</Badge>
                      ))}
                    </div>
                  </Link>
                ))}
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
                    <p className="text-[11px] uppercase tracking-[0.4em] text-slate-300">YouHair routine</p>
                    <h3 className="text-2xl font-bold mt-2">Your custom hair plan</h3>
                    <p className="text-sm text-slate-300 mt-2">
                      {hairType && <span className="capitalize">{hairType}</span>} {texture && <>• {texture} texture</>} {hairColor && <>• {hairColor} color</>}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-[0.2em]">AI matched</div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Routine steps</p>
                    <ol className="mt-3 space-y-2 text-sm">
                      {routineSteps.map((step, i) => (
                        <li key={step.title} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">{i + 1}</span>
                          <div>
                            <p className="font-semibold">{step.title}</p>
                            <p className="text-xs text-slate-300">{step.productName}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Haircut suggestion</p>
                      <p className="text-lg font-semibold mt-2">{haircutSuggestion.title}</p>
                      <p className="text-xs text-slate-300 mt-2">{haircutSuggestion.detail}</p>
                    </div>
                    {tip && <p className="text-xs text-slate-200 mt-4">Tip: {tip}</p>}
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Product lineup</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {recommendations.map((p) => (
                      <span key={p.id} className="px-3 py-1 rounded-full text-xs bg-white/10">
                        {p.name}
                      </span>
                    ))}
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
