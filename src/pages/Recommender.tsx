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
import { toast } from "sonner";
import { Download, Scissors, Sparkles, Plus } from "lucide-react";
import { jsPDF } from "jspdf";

const HAIR_TYPES = ["straight", "wavy", "curly", "coily"];
const TEXTURES = ["fine", "medium", "coarse"];
const THICKNESS = ["thin", "medium", "thick"];
const DENSITY = ["low", "medium", "high"];
const SCALP = ["oily", "balanced", "dry"];
const HAIR_COLORS = ["black", "brown", "blonde", "ranger"];
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

function stepFor(product: Product) {
  const cat = product.category?.toLowerCase() ?? "";
  for (const key of Object.keys(STEP_COPY)) if (cat.includes(key)) return STEP_COPY[key];
  const slug = product.slug?.toLowerCase() ?? "";
  for (const key of Object.keys(STEP_COPY)) if (slug.includes(key)) return STEP_COPY[key];
  return STEP_COPY.default;
}

function pickHaircut(hairType: string, hairColor: string) {
  if (hairColor === "ranger") {
    return { title: "Bold textured crop", detail: "Choppy short layers on top with faded sides — built to show off statement color." };
  }
  switch (hairType) {
    case "straight":
      return { title: "Classic side part", detail: "Sharp, tapered sides with a clean part — sleek and timeless on straight hair." };
    case "wavy":
      return { title: "Textured fringe", detail: "Soft messy top with a forward-falling fringe — leans into natural waves." };
    case "curly":
      return { title: "Curly top fade", detail: "Mid fade with length on top so curls have room to spring." };
    case "coily":
      return { title: "Tapered shape-up", detail: "Crisp shape-up with a low taper — maintains height on top with neat edges." };
    default:
      return { title: "Modern crop", detail: "Short, textured, and versatile — works with most hair types." };
  }
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

interface RoutineStep {
  product_id: string;
  title: string;
  description: string;
  justification?: string;
}


interface SnapshotRoutine {
  inputs: {
    hairType: string;
    texture: string;
    thickness: string;
    density: string;
    scalpType: string;
    hairColor: string;
    concerns: string[];
  };
  products: Pick<Product, "id" | "name" | "slug" | "price" | "image_url" | "category">[];
  steps: RoutineStep[];
  haircut: { title: string; detail: string };
  haircutImage: string | null;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
  const [exporting, setExporting] = useState(false);
  const [routine, setRoutine] = useState<SnapshotRoutine | null>(null);

  useEffect(() => {
    if (existing) {
      setHairType(existing.hair_type ?? "");
      setTexture(existing.texture ?? "");
      setThickness(existing.thickness ?? "");
      setDensity(existing.density ?? "");
      setScalpType(existing.scalp_type ?? "");
      setHairColor(existing.hair_color ?? "");
      setConcerns(existing.concerns ?? []);
      const saved = (existing as any).saved_routine as SnapshotRoutine | null;
      if (saved && saved.products?.length) setRoutine(saved);
    }
  }, [existing]);

  const toggleConcern = (c: string) =>
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const buildRecommendations = (): Product[] => {
    if (!hairType) return [];
    const scored = products.map((p) => {
      let score = 0;
      if (p.hair_types?.includes(hairType)) score += 3;
      const concernOverlap = (p.concerns ?? []).filter(
        (c) => concerns.includes(c) || (scalpType === "oily" && c === "oily") || (scalpType === "dry" && c === "dry")
      ).length;
      score += concernOverlap * 2;
      return { p, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.p)
      .slice(0, 5);
  };

  const handleGenerate = async () => {
    if (!hairType) {
      toast.error("Pick your hair type first");
      return;
    }

    // Easter egg: ranger color short-circuits everything
    if (hairColor === "ranger") {
      const rangerSnapshot: SnapshotRoutine = {
        inputs: { hairType, texture, thickness, density, scalpType, hairColor, concerns: [...concerns] },
        products: [],
        steps: [],
        haircut: { title: "", detail: "" },
        haircutImage: null,
      };
      setRoutine(rangerSnapshot);
      if (user) {
        try {
          await saveProfile.mutateAsync({
            hair_type: hairType || null,
            hair_color: hairColor || null,
            texture: texture || null,
            thickness: thickness || null,
            density: density || null,
            scalp_type: scalpType || null,
            concerns,
            // @ts-ignore
            saved_routine: rangerSnapshot,
          });
        } catch (e) { console.error(e); }
      }
      return;
    }

    const matched = buildRecommendations();
    if (matched.length === 0) {
      toast.error("No matches yet — try adding a concern or different hair type.");
      return;
    }
    const haircut = pickHaircut(hairType, hairColor);
    const slimProducts = matched.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      image_url: p.image_url,
      category: p.category,
    }));

    setRoutine(null);
    setLoadingTip(true);

    try {
      const { data, error } = await supabase.functions.invoke("hair-recommend", {
        body: {
          hairType,
          hairColor,
          texture,
          thickness,
          density,
          scalpType,
          concerns,
          haircutTitle: haircut.title,
          haircutDetail: haircut.detail,
          products: slimProducts.map((p) => ({ id: p.id, name: p.name, category: p.category, slug: p.slug })),
        },
      });
      if (error) throw error;

      const aiSteps: RoutineStep[] = Array.isArray(data?.steps) ? data.steps : [];
      // Order steps to match product order; fall back to static copy if AI step missing
      const orderedSteps: RoutineStep[] = slimProducts.map((p) => {
        const found = aiSteps.find((s) => s.product_id === p.id);
        if (found) return found;
        const fallback = stepFor(p as Product);
        return { product_id: p.id, title: fallback.title, description: fallback.description };
      });

      const finalSnapshot: SnapshotRoutine = {
        inputs: { hairType, texture, thickness, density, scalpType, hairColor, concerns: [...concerns] },
        products: slimProducts,
        steps: orderedSteps,
        haircut,
        haircutImage: data?.imageUrl ?? null,
      };
      setRoutine(finalSnapshot);

      if (user) {
        await saveProfile.mutateAsync({
          hair_type: hairType || null,
          hair_color: hairColor || null,
          texture: texture || null,
          thickness: thickness || null,
          density: density || null,
          scalp_type: scalpType || null,
          concerns,
          // @ts-ignore - column exists, types may regenerate
          saved_routine: finalSnapshot,
        });
      }
      if (!data?.imageUrl) toast.error("Couldn't generate the haircut image, but your routine is ready.");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate your routine. Please try again.");
    } finally {
      setLoadingTip(false);
    }
  };


  const handleAddToCart = (p: SnapshotRoutine["products"][number]) => {
    add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url ?? null });
    toast.success(`${p.name} added to bag`);
  };

  const handleExportPoster = async () => {
    if (!routine) return;
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 40;

      // Header
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 110, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("lushlocks routine", margin, 50);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const { inputs } = routine;
      const meta = [
        inputs.hairType && `${inputs.hairType} hair`,
        inputs.texture && `${inputs.texture} texture`,
        inputs.hairColor && `${inputs.hairColor} color`,
        inputs.thickness && `${inputs.thickness} thickness`,
        inputs.density && `${inputs.density} density`,
        inputs.scalpType && `${inputs.scalpType} scalp`,
        inputs.concerns.length ? `concerns: ${inputs.concerns.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" • ");
      pdf.text(pdf.splitTextToSize(meta, pageW - margin * 2), margin, 78);

      pdf.setTextColor(15, 23, 42);
      let y = 140;

      // Haircut suggestion
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Haircut suggestion", margin, y);
      y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(routine.haircut.title, margin, y + 14);
      const detailLines = pdf.splitTextToSize(routine.haircut.detail, pageW - margin * 2 - 160);
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      pdf.text(detailLines, margin, y + 32);
      pdf.setTextColor(15, 23, 42);

      if (routine.haircutImage) {
        const dataUrl = await urlToDataUrl(routine.haircutImage);
        if (dataUrl) {
          try {
            pdf.addImage(dataUrl, "PNG", pageW - margin - 140, y - 4, 140, 140);
          } catch (e) { console.error(e); }
        }
      }
      y += 160;

      // Routine steps
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(`Your ${routine.products.length}-step routine`, margin, y);
      y += 18;

      for (let i = 0; i < routine.products.length; i++) {
        const p = routine.products[i];
        const step = routine.steps[i] ?? stepFor(p as Product);
        if (y > pageH - 100) { pdf.addPage(); y = margin; }

        // image box
        const imgSize = 60;
        if (p.image_url) {
          const dataUrl = await urlToDataUrl(p.image_url);
          if (dataUrl) {
            try { pdf.addImage(dataUrl, "JPEG", margin, y, imgSize, imgSize); } catch { /* ignore */ }
          }
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(`${i + 1}. ${step.title}`, margin + imgSize + 14, y + 16);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        const descLines = pdf.splitTextToSize(step.description, pageW - margin * 2 - imgSize - 14);
        pdf.text(descLines, margin + imgSize + 14, y + 32);
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(10);
        pdf.text(`${p.name} — $${Number(p.price).toFixed(2)}`, margin + imgSize + 14, y + 56);
        y += imgSize + 18;
      }

      pdf.save("lushlocks-routine.pdf");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't export the poster.");
    } finally {
      setExporting(false);
    }
  };

  const inputsChanged = useMemo(() => {
    if (!routine) return false;
    const i = routine.inputs;
    return (
      i.hairType !== hairType ||
      i.texture !== texture ||
      i.thickness !== thickness ||
      i.density !== density ||
      i.scalpType !== scalpType ||
      i.hairColor !== hairColor ||
      JSON.stringify(i.concerns) !== JSON.stringify(concerns)
    );
  }, [routine, hairType, texture, thickness, density, scalpType, hairColor, concerns]);

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-3">
            <Sparkles className="w-3 h-3 text-primary" /> Hair survey
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Find your routine</h1>
          <p className="text-muted-foreground mt-2">Tell us about your hair — we'll build a routine with your matched products.</p>
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
            {loadingTip ? "Building your routine…" : routine ? "Regenerate routine" : "Save & get my routine"}
          </Button>
          {routine && inputsChanged && !loadingTip && (
            <p className="text-xs text-muted-foreground text-center">You changed your answers — tap regenerate to update your routine.</p>
          )}
        </div>

        {routine && routine.inputs.hairColor === "ranger" && (
          <div className="mt-8 bg-card p-10 rounded-3xl border-4 border-primary text-center">
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-primary">
              GET CHEMOTHERAPY
            </h2>
          </div>
        )}

        {routine && routine.inputs.hairColor !== "ranger" && (
          <div className="mt-8 space-y-6">
            <div className="bg-card p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your routine</p>
                  <h2 className="font-display text-2xl font-bold mt-1">Your {routine.products.length}-step routine</h2>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={handleExportPoster} disabled={exporting}>
                  <Download className="w-4 h-4 mr-2" />
                  {exporting ? "Exporting…" : "Export PDF"}
                </Button>
              </div>

              <div className="grid gap-3">
                {routine.products.map((p, i) => {
                  const step = routine.steps[i] ?? { title: "", description: "" };
                  return (
                    <div key={p.id} className="flex items-start gap-4 bg-muted/50 rounded-2xl p-4">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {i + 1}
                      </div>
                      <Link to={`/shop/${p.slug}`} className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-background">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold">{step.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Link to={`/shop/${p.slug}`} className="text-sm font-medium hover:text-primary transition-colors">{p.name}</Link>
                          <span className="text-xs text-muted-foreground capitalize">· {p.category}</span>
                          <span className="text-sm">· ${Number(p.price).toFixed(2)}</span>
                        </div>
                      </div>
                      <Button size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0" onClick={() => handleAddToCart(p)}>
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
                  <h3 className="font-display text-xl font-bold">{routine.haircut.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{routine.haircut.detail}</p>
                  {routine.inputs.hairColor && (
                    <p className="text-xs text-muted-foreground mt-2 capitalize">
                      Rendered for {routine.inputs.hairColor} {routine.inputs.hairType} hair
                    </p>
                  )}
                </div>
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted relative">
                  {routine.haircutImage ? (
                    <img src={routine.haircutImage} alt={routine.haircut.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                      {loadingTip ? "Generating image…" : "Image unavailable"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
