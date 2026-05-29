import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, Sparkles, User, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { to: "/shop", label: "Shop" },
    { to: "/recommender", label: "Find my routine" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          <Link to="/" className="shrink-0"><Logo size="md" /></Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/account")}>
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Account</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
            )}
            <Button variant="ghost" size="sm" className="rounded-full relative" onClick={() => navigate("/cart")}>
              <ShoppingBag className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>
        <nav className="md:hidden flex items-center justify-center gap-1 pb-2 px-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-4 py-1.5 text-sm font-medium rounded-full ${
                  isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/50 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} YouHair — beautiful hair, personalized.</p>
          <p className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI-powered routines</p>
        </div>
      </footer>
    </div>
  );
}
