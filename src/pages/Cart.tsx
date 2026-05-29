import { Link, useNavigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";

export default function Cart() {
  const { items, setQty, remove, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold">Your bag is empty</h1>
          <p className="text-muted-foreground mt-2">Add a few favorites to get started.</p>
          <Button asChild className="mt-6 rounded-full bg-foreground text-background hover:bg-foreground/90"><Link to="/shop">Browse products</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em] mb-8">Your bag</h1>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-4 bg-card p-3 rounded-3xl">
              <div className="w-20 h-20 bg-muted rounded-2xl overflow-hidden shrink-0">
                {i.image_url && <img src={i.image_url} alt={i.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold truncate">{i.name}</p>
                <p className="text-sm text-muted-foreground">${i.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                <Button size="icon" variant="ghost" className="rounded-full h-7 w-7" onClick={() => setQty(i.id, i.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
                <Button size="icon" variant="ghost" className="rounded-full h-7 w-7" onClick={() => setQty(i.id, i.quantity + 1)}><Plus className="w-3 h-3" /></Button>
              </div>
              <p className="w-20 text-right font-medium hidden sm:block">${(i.price * i.quantity).toFixed(2)}</p>
              <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => remove(i.id)}><X className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-card p-6 rounded-3xl max-w-sm ml-auto">
          <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1"><span>Shipping</span><span>Free</span></div>
          <div className="flex justify-between font-display font-bold text-lg mt-3 pt-3 border-t border-border"><span>Total</span><span>${total.toFixed(2)}</span></div>
          <Button
            size="lg"
            className="w-full mt-5 rounded-full bg-foreground text-background hover:bg-foreground/90"
            onClick={() => navigate(user ? "/checkout" : "/auth?redirect=/checkout")}
          >
            {user ? "Checkout" : "Sign in to checkout"}
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
