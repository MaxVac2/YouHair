import { useParams, Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ProductDetail() {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug);
  const { add } = useCart();
  const navigate = useNavigate();

  if (isLoading) return <SiteLayout><div className="max-w-6xl mx-auto px-6 py-20 text-center text-muted-foreground">Loading…</div></SiteLayout>;
  if (!product) return <SiteLayout><div className="max-w-6xl mx-auto px-6 py-20 text-center"><p>Product not found.</p><Link to="/shop" className="text-primary">Back to shop</Link></div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 mt-6">
          <div className="aspect-square bg-muted rounded-3xl overflow-hidden">
            {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em] mt-1">{product.name}</h1>
            <p className="text-2xl font-medium mt-3">${Number(product.price).toFixed(2)}</p>
            <p className="text-muted-foreground mt-5 leading-relaxed">{product.description}</p>

            {(product.hair_types?.length || product.concerns?.length) ? (
              <div className="mt-6 space-y-3">
                {product.hair_types?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Best for</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.hair_types.map((t) => <Badge key={t} variant="secondary" className="rounded-full capitalize">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {product.concerns?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Targets</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.concerns.map((c) => <Badge key={c} variant="outline" className="rounded-full capitalize">{c}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex gap-3 mt-8">
              <Button
                size="lg"
                className="rounded-full bg-foreground text-background hover:bg-foreground/90 flex-1"
                onClick={() => {
                  add({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url });
                  toast.success("Added to bag");
                }}
              >
                Add to bag
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  add({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url });
                  navigate("/cart");
                }}
              >
                Buy now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
