import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useCart } from "@/contexts/CartContext";
import { usePlaceOrder } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      if (user) await placeOrder.mutateAsync(items);
      clear();
      toast.success("Order placed! 🎉 (mock checkout — no charge)");
      navigate("/account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Checkout</h1>
        <p className="text-muted-foreground mt-2 text-sm">This is a demo checkout — no real payment is taken.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="bg-card p-6 rounded-3xl space-y-4">
            <h2 className="font-display font-semibold">Shipping</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Full name</Label><Input required className="rounded-full h-11 mt-1.5" /></div>
              <div><Label>Phone</Label><Input className="rounded-full h-11 mt-1.5" /></div>
            </div>
            <div><Label>Address</Label><Input required className="rounded-full h-11 mt-1.5" /></div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>City</Label><Input required className="rounded-full h-11 mt-1.5" /></div>
              <div><Label>State</Label><Input className="rounded-full h-11 mt-1.5" /></div>
              <div><Label>ZIP</Label><Input required className="rounded-full h-11 mt-1.5" /></div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl">
            <h2 className="font-display font-semibold mb-4">Order summary</h2>
            <div className="space-y-2 text-sm">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span className="text-muted-foreground">{i.name} × {i.quantity}</span>
                  <span>${(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-display font-bold text-base pt-3 mt-3 border-t border-border">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90" disabled={submitting || items.length === 0}>
            {submitting ? "Placing order…" : `Place order — $${total.toFixed(2)}`}
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}
