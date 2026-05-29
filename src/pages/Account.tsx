import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { useHairProfile } from "@/hooks/useHairProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Account() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useOrders();
  const { data: hair } = useHairProfile();

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">My account</h1>
          <p className="text-muted-foreground mt-1 text-sm">{user?.email}</p>
        </div>

        {/* Hair profile */}
        <section className="bg-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">My hair profile</h2>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/recommender">{hair ? "Update" : "Create"}</Link>
            </Button>
          </div>
          {hair ? (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {hair.hair_type && <div><span className="text-muted-foreground">Type: </span><span className="capitalize">{hair.hair_type}</span></div>}
              {hair.texture && <div><span className="text-muted-foreground">Texture: </span><span className="capitalize">{hair.texture}</span></div>}
              {hair.hair_color && <div><span className="text-muted-foreground">Color: </span><span className="capitalize">{hair.hair_color}</span></div>}
              {hair.thickness && <div><span className="text-muted-foreground">Thickness: </span><span className="capitalize">{hair.thickness}</span></div>}
              {hair.density && <div><span className="text-muted-foreground">Density: </span><span className="capitalize">{hair.density}</span></div>}
              {hair.scalp_type && <div><span className="text-muted-foreground">Scalp: </span><span className="capitalize">{hair.scalp_type}</span></div>}
              {hair.concerns?.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Concerns: </span>
                  <span className="inline-flex flex-wrap gap-1 ml-1">
                    {hair.concerns.map((c) => <Badge key={c} variant="secondary" className="rounded-full capitalize">{c}</Badge>)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No profile yet — take the quiz to get personalized picks.</p>
          )}
        </section>

        {/* Orders */}
        <section>
          <h2 className="font-display text-xl font-bold mb-4">Order history</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : orders.length === 0 ? (
            <div className="bg-card p-8 rounded-3xl text-center">
              <p className="text-muted-foreground">No orders yet.</p>
              <Button asChild className="mt-4 rounded-full bg-foreground text-background hover:bg-foreground/90"><Link to="/shop">Start shopping</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o: any) => (
                <div key={o.id} className="bg-card p-5 rounded-3xl">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8)}</p>
                      <p className="text-sm">{new Date(o.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="rounded-full capitalize">{o.status}</Badge>
                      <p className="font-display font-bold mt-1">${Number(o.total).toFixed(2)}</p>
                    </div>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 border-t border-border pt-3">
                    {o.order_items?.map((it: any) => (
                      <li key={it.id} className="flex justify-between"><span>{it.product_name} × {it.quantity}</span><span>${(Number(it.unit_price) * it.quantity).toFixed(2)}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
