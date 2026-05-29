import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useHairProfile, useSaveHairProfile } from "@/hooks/useHairProfile";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const HAIR_TYPES = ["straight", "wavy", "curly", "coily"];
const TEXTURES = ["fine", "medium", "coarse"];
const THICKNESS = ["thin", "medium", "thick"];
const DENSITY = ["low", "medium", "high"];
const SCALP = ["oily", "balanced", "dry"];
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

export default function Recommender() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: existing } = useHairProfile();
  const saveProfile = useSaveHairProfile();
  const { data: products = [] } = useProducts();

  const [hairType, setHairType] = useState("");
  const [texture, setTexture] = useState("");
  const [thickness, setThickness] = useState("");
  const [density, setDensity] = useState("");
  const [scalpType, setScalpType] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [tip, setTip] = useState<string>("");
  const [loadingTip, setLoadingTip] = useState(false);

  useEffect(() => {
    if (existing) {
      setHairType(existing.hair_type ?? "");
      setTexture(existing.texture ?? "");
      setThickness(existing.thickness ?? "");
      setDensity(existing.density ?? "");
      setScalpType(existing.scalp_type ?? "");
      setConcerns(existing.concerns ?? []);
    }
  }, [existing]);

  const toggleConcern = (c: string) =>
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  // Score products by overlap
  const recommendations = (() => {
    if (!hairType) return [];
    const scored = products.map((p) => {
      let score = 0;
      if (p.hair_types?.includes(hairType)) score += 3;
      const concernOverlap = (p.concerns ?? []).filter((c) => concerns.includes(c) || (scalpType === "oily" && c === "oily") || (scalpType === "dry" && c === "dry")).length;
      score += concernOverlap * 2;
      return { p, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((s) => s.p);
  })();

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
          texture: texture || null,
          thickness: thickness || null,
          density: density || null,
          scalp_type: scalpType || null,
          concerns,
        });
      }
      const { data, error } = await supabase.functions.invoke("hair-recommend", {
        body: { hairType, texture, thickness, density, scalpType, concerns, productNames: recommendations.map((p) => p.name) },
      });
      if (error) throw error;
      setTip(data?.advice ?? "");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate routine — your matches are still below.");
    } finally {
      setLoadingTip(false);
    }
  };

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-3">
            <Sparkles className="w-3 h-3 text-primary" /> Hair quiz
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Find your routine</h1>
          <p className="text-muted-foreground mt-2">Tell us about your hair — we'll match products and write you a personalized tip.</p>
        </div>

        <div className="bg-card p-6 sm:p-8 rounded-3xl space-y-6">
          {[
            { label: "Hair type", value: hairType, set: setHairType, options: HAIR_TYPES },
            { label: "Strand texture", value: texture, set: setTexture, options: TEXTURES },
            { label: "Thickness", value: thickness, set: setThickness, options: THICKNESS },
            { label: "Density (how much hair)", value: density, set: setDensity, options: DENSITY },
            { label: "Scalp", value: scalpType, set: setScalpType, options: SCALP },
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
            {loadingTip ? "Building your routine…" : user ? "Save & get my routine" : "Get my routine"}
          </Button>
          {!user && (
            <p className="text-xs text-muted-foreground text-center">
              <Link to="/auth" className="text-primary underline-offset-4 hover:underline">Sign in</Link> to save your profile and order history.
            </p>
          )}
        </div>

        {tip && (
          <div className="mt-8 bg-primary/5 p-6 rounded-3xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="font-display font-semibold">Your personalized tip</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{tip}</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="mt-10">
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
        )}
      </div>
    </SiteLayout>
  );
}
