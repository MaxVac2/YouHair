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
import { Download, Scissors, Sparkles, Plus, Camera, Loader2 } from "lucide-react";
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
    return { title: "Statement textured crop", detail: "Choppy short layers on top with a skin fade — designed to show off bold fashion color." };
  }
  switch (hairType) {
    case "straight":
      return { title: "Mid-length curtain cut", detail: "Soft middle-parted curtains falling to the brows with a tapered back — one of the most in-style cuts right now on straight hair." };
    case "wavy":
      return { title: "Modern broccoli crop", detail: "Voluminous textured top with a mid fade — currently trending for wavy hair, plays up natural movement." };
    case "curly":
      return { title: "Curly mid-fade with curtain bangs", detail: "Length kept on top so curls drop into a soft fringe, with a sharp mid fade on the sides." };
    case "coily":
      return { title: "Burst fade with sponge twists", detail: "Twisted top texture with a clean burst fade around the ears — fresh, sharp, very on-trend." };
    default:
      return { title: "Textured mid-fade crop", detail: "Short textured top with a mid fade — the go-to modern men's cut, works on almost any hair type." };
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
  tryonImage?: string | null;
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
  const [tryingOn, setTryingOn] = useState(false);
  const tryonInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (existing) {
      setHairType(existing.hair_type ?? "");
      setTexture(existing.texture ?? "");
      setThickness(existing.thickness ?? "");
      setDensity(existing.density ?? "");
      setScalpType(existing.scalp_type ?? "");
      setHairColor(existing.hair_color ?? "");
      setConcerns(existing.concerns ?? []);
      const saved = (existing as any).saved_routine as Partial<SnapshotRoutine> | null;
      if (saved && saved.products?.length) {
        // Normalize older snapshots so missing fields don't crash render
        setRoutine({
          inputs: saved.inputs ?? {
            hairType: existing.hair_type ?? "",
            texture: existing.texture ?? "",
            thickness: existing.thickness ?? "",
            density: existing.density ?? "",
            scalpType: existing.scalp_type ?? "",
            hairColor: existing.hair_color ?? "",
            concerns: existing.concerns ?? [],
          },
          products: saved.products,
          steps: saved.steps ?? [],
          haircut: saved.haircut ?? { title: "", detail: "" },
          haircutImage: saved.haircutImage ?? null,
          tryonImage: saved.tryonImage ?? null,
        });
      }
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
    const ranked = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return [];
    // Aim for ~3 products, allow 2–5 depending on how many strongly match.
    const topScore = ranked[0].score;
    const strong = ranked.filter((s) => s.score >= Math.max(2, topScore - 1));
    const target = Math.min(5, Math.max(2, strong.length >= 3 ? 3 : strong.length));
    const count = Math.min(ranked.length, Math.max(target, Math.min(strong.length, 4)));
    return ranked.slice(0, Math.min(5, Math.max(2, count))).map((s) => s.p);
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
        return { product_id: p.id, title: fallback.title, description: fallback.description, justification: "" };
      });


      const finalSnapshot: SnapshotRoutine = {
        inputs: { hairType, texture, thickness, density, scalpType, hairColor, concerns: [...concerns] },
        products: slimProducts,
        steps: orderedSteps,
        haircut,
        haircutImage: data?.imageUrl ?? null,
        tryonImage: null,
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

  const resizeToDataUrl = (file: File, maxDim = 768): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Couldn't read image"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Couldn't decode image"));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleTryOnFile = async (file: File | null) => {
    if (!file || !routine) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    setTryingOn(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      const { data, error } = await supabase.functions.invoke("haircut-tryon", {
        body: {
          faceImage: dataUrl,
          haircutTitle: routine.haircut.title,
          haircutDetail: routine.haircut.detail,
          hairColor: routine.inputs.hairColor,
          hairType: routine.inputs.hairType,
        },
      });
      if (error) throw error;
      const url: string | null = data?.imageUrl ?? null;
      if (!url) throw new Error("No image returned");

      const updated: SnapshotRoutine = { ...routine, tryonImage: url };
      setRoutine(updated);
      if (user) {
        try {
          await saveProfile.mutateAsync({
            hair_type: routine.inputs.hairType || null,
            hair_color: routine.inputs.hairColor || null,
            texture: routine.inputs.texture || null,
            thickness: routine.inputs.thickness || null,
            density: routine.inputs.density || null,
            scalp_type: routine.inputs.scalpType || null,
            concerns: routine.inputs.concerns,
            // @ts-ignore
            saved_routine: updated,
          });
        } catch (e) { console.error(e); }
      }
      toast.success("Try-on ready!");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate your try-on photo.");
    } finally {
      setTryingOn(false);
      if (tryonInputRef.current) tryonInputRef.current.value = "";
    }
  };


  const handleExportPoster = async () => {
    if (!routine) return;
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 40;

      // ---------- brand palette ----------
      const ink: [number, number, number] = [15, 23, 42];
      const muted: [number, number, number] = [110, 116, 132];
      const soft: [number, number, number] = [243, 244, 246];
      const rose: [number, number, number] = [225, 56, 119]; // ~ primary
      const roseSoft: [number, number, number] = [253, 232, 240];

      const setFill = (c: [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);
      const setText = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
      const setDraw = (c: [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2]);

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - 60) { pdf.addPage(); y = margin; drawFooter(); }
      };

      const drawFooter = () => {
        setText(muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("YouHair · personalised hair plan", margin, pageH - 24);
        pdf.text(`${pdf.getCurrentPageInfo().pageNumber}`, pageW - margin, pageH - 24, { align: "right" });
      };

      // ---------- cover header ----------
      setFill(ink);
      pdf.rect(0, 0, pageW, 150, "F");
      // rose accent stripe
      setFill(rose);
      pdf.rect(0, 150, pageW, 4, "F");

      setText([255, 255, 255]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("YOUHAIR", margin, 50);
      pdf.setFontSize(28);
      pdf.text("Your hair plan", margin, 86);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const { inputs } = routine;
      pdf.text(`Built for your ${inputs.hairType || "personal"} hair · generated by AI`, margin, 108);

      // profile chips
      const chips = [
        inputs.hairType && `${inputs.hairType} hair`,
        inputs.texture && `${inputs.texture} strands`,
        inputs.hairColor && `${inputs.hairColor}`,
        inputs.thickness && `${inputs.thickness} thickness`,
        inputs.density && `${inputs.density} density`,
        inputs.scalpType && `${inputs.scalpType} scalp`,
        ...inputs.concerns.map((c) => c),
      ].filter(Boolean) as string[];

      let y = 180;
      let chipX = margin;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      chips.forEach((label) => {
        const w = pdf.getTextWidth(label) + 16;
        if (chipX + w > pageW - margin) { chipX = margin; y += 22; }
        setFill(soft);
        pdf.roundedRect(chipX, y - 12, w, 18, 9, 9, "F");
        setText(ink);
        pdf.text(label, chipX + 8, y);
        chipX += w + 6;
      });
      y += 26;

      // ---------- haircut card ----------
      ensureSpace(190);
      const cardX = margin;
      const cardY = y;
      const cardW = pageW - margin * 2;
      const cardH = 180;
      setFill(soft);
      pdf.roundedRect(cardX, cardY, cardW, cardH, 14, 14, "F");

      const imgBox = 150;
      const imgX = cardX + cardW - imgBox - 14;
      const imgY = cardY + 14;

      if (routine.haircutImage) {
        const d = await urlToDataUrl(routine.haircutImage);
        if (d) {
          try { pdf.addImage(d, "PNG", imgX, imgY, imgBox, imgBox); } catch (e) { console.error(e); }
        }
      } else {
        setFill([220, 222, 230]);
        pdf.roundedRect(imgX, imgY, imgBox, imgBox, 10, 10, "F");
      }

      setText(rose);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("HAIRCUT SUGGESTION", cardX + 18, cardY + 24);
      setText(ink);
      pdf.setFontSize(18);
      const titleLines = pdf.splitTextToSize(routine.haircut.title || "Your haircut", cardW - imgBox - 50);
      pdf.text(titleLines, cardX + 18, cardY + 46);
      setText(muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const detailLines = pdf.splitTextToSize(routine.haircut.detail || "", cardW - imgBox - 50);
      pdf.text(detailLines, cardX + 18, cardY + 46 + titleLines.length * 18 + 6);

      y = cardY + cardH + 24;

      // ---------- try-on card ----------
      if (routine.tryonImage) {
        ensureSpace(260);
        const tCardY = y;
        const tCardH = 240;
        setFill(roseSoft);
        pdf.roundedRect(margin, tCardY, cardW, tCardH, 14, 14, "F");
        setText(rose);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text("YOU, WITH THE HAIRCUT", margin + 18, tCardY + 24);
        setText(ink);
        pdf.setFontSize(14);
        pdf.text("AI try-on", margin + 18, tCardY + 44);
        setText(muted);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        const tLines = pdf.splitTextToSize("A look at how this style fits your face. Generated with AI from your photo.", cardW - 230);
        pdf.text(tLines, margin + 18, tCardY + 60);

        const tImg = 200;
        const tx = margin + cardW - tImg - 14;
        const ty = tCardY + (tCardH - tImg) / 2;
        const d = await urlToDataUrl(routine.tryonImage);
        if (d) {
          try { pdf.addImage(d, "PNG", tx, ty, tImg, tImg); } catch (e) { console.error(e); }
        }
        y = tCardY + tCardH + 24;
      }

      // ---------- routine ----------
      ensureSpace(60);
      setText(rose);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("PERSONALISED ROUTINE", margin, y);
      setText(ink);
      pdf.setFontSize(18);
      pdf.text(`Your ${routine.products.length}-step routine`, margin, y + 22);
      y += 40;

      for (let i = 0; i < routine.products.length; i++) {
        const p = routine.products[i];
        const step = routine.steps[i] ?? { ...stepFor(p as Product), justification: "" };
        const imgSize = 70;

        // measure block height
        const textX = margin + imgSize + 20;
        const textW = pageW - margin * 2 - imgSize - 36;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const descLines = pdf.splitTextToSize(step.description || "", textW);
        const justLines = (step as RoutineStep).justification
          ? pdf.splitTextToSize(`Why this for you — ${(step as RoutineStep).justification}`, textW)
          : [];
        const blockH = Math.max(imgSize + 24, 50 + descLines.length * 12 + (justLines.length ? justLines.length * 11 + 10 : 0));
        ensureSpace(blockH + 12);

        // card bg
        setFill([252, 252, 253]);
        setDraw([235, 236, 240]);
        pdf.roundedRect(margin, y, pageW - margin * 2, blockH, 10, 10, "FD");

        // image
        if (p.image_url) {
          const d = await urlToDataUrl(p.image_url);
          if (d) {
            try { pdf.addImage(d, "JPEG", margin + 12, y + 12, imgSize, imgSize); } catch { /* ignore */ }
          }
        }

        // step badge
        setFill(rose);
        pdf.circle(margin + 12 + imgSize - 8, y + 12 + 8, 11, "F");
        setText([255, 255, 255]);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(`${i + 1}`, margin + 12 + imgSize - 8, y + 12 + 11, { align: "center" });

        // name + step
        setText(ink);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(p.name, textX, y + 22);
        setText(muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        if (step.title) pdf.text(`${step.title.toUpperCase()}  ·  $${Number(p.price).toFixed(2)}`, textX, y + 35);
        else pdf.text(`$${Number(p.price).toFixed(2)}`, textX, y + 35);

        // description
        setText([60, 60, 70]);
        pdf.setFontSize(10);
        pdf.text(descLines, textX, y + 50);

        // justification
        if (justLines.length) {
          setText(rose);
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(9);
          pdf.text(justLines, textX, y + 50 + descLines.length * 12 + 6);
        }

        y += blockH + 10;
      }

      // ---------- footer on every page ----------
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        drawFooter();
      }

      pdf.save("youhair-routine.pdf");
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
                  const step = (routine.steps ?? [])[i] ?? { title: "", description: "", justification: "" };
                  return (
                    <div key={p.id} className="flex items-start gap-4 bg-muted/50 rounded-2xl p-4">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {i + 1}
                      </div>
                      <Link to={`/shop/${p.slug}`} className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-background">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <Link to={`/shop/${p.slug}`} className="font-display font-semibold hover:text-primary transition-colors">{p.name}</Link>
                          {step.title && <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">· {step.title}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        {step.justification && (
                          <p className="text-sm mt-2 text-foreground/80 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                            <span className="font-medium text-primary">Why this for you: </span>{step.justification}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground capitalize">{p.category}</span>
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

            {/* AI try-on */}
            <div className="bg-card p-6 rounded-3xl">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                <Camera className="w-4 h-4 text-primary" /> Try it on your face
              </div>
              <div className="grid sm:grid-cols-[1fr_220px] gap-5 mt-3 items-start">
                <div>
                  <h3 className="font-display text-xl font-bold">See yourself with this haircut</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload a clear, front-facing photo of your face. We'll generate a portrait of you wearing the{" "}
                    <span className="font-medium text-foreground">{routine.haircut.title}</span>. Your photo is sent only to generate this image.
                  </p>
                  <input
                    ref={tryonInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleTryOnFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                      onClick={() => tryonInputRef.current?.click()}
                      disabled={tryingOn}
                    >
                      {tryingOn ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                      ) : routine.tryonImage ? (
                        <><Camera className="w-4 h-4 mr-2" /> Try another photo</>
                      ) : (
                        <><Camera className="w-4 h-4 mr-2" /> Upload photo</>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted relative">
                  {routine.tryonImage ? (
                    <img src={routine.tryonImage} alt="You with the suggested haircut" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground text-center px-3">
                      {tryingOn ? "Generating your try-on…" : "Your try-on photo will appear here"}
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
