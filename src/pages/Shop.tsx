import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";

export default function Shop() {
  const { data: products = [], isLoading } = useProducts();
  const [cat, setCat] = useState<string>("all");
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category))).sort();
    return ["all", ...unique];
  }, [products]);

  const filtered = useMemo(
    () => (cat === "all" ? products : products.filter((p) => p.category === cat)),
    [products, cat]
  );

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[-0.02em]">Shop the collection</h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Clean, salon-grade products for every hair type. Not sure where to start? <Link to="/recommender" className="text-primary underline-offset-4 hover:underline">Take the quiz</Link>.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              className={`rounded-full capitalize ${cat === c ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
              onClick={() => setCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((p) => (
              <Link key={p.id} to={`/shop/${p.slug}`} className="group block">
                <div className="aspect-square bg-muted rounded-3xl overflow-hidden mb-3">
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{p.category}</p>
                <h3 className="font-display font-semibold text-base leading-tight mt-0.5 group-hover:text-primary transition-colors">{p.name}</h3>
                <p className="text-sm text-foreground mt-1">${Number(p.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
