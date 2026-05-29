import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Leaf, Heart } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";

export default function Landing() {
  const { data: products = [] } = useProducts();
  const featured = products.slice(0, 4);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI-personalized haircare
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.02em] text-foreground max-w-3xl mx-auto"
          >
            Haircare that actually <span className="text-primary">knows your hair.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Tell us your type, texture, density and concerns. Our AI builds a routine from clean, salon-grade products — delivered.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button asChild size="lg" className="rounded-full h-12 px-7 bg-foreground text-background hover:bg-foreground/90">
              <Link to="/recommender">Find my routine <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-7">
              <Link to="/shop">Shop products</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Bestsellers</h2>
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {featured.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link to={`/shop/${p.slug}`} className="group block">
                <div className="aspect-square bg-muted rounded-3xl overflow-hidden mb-3">
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{p.category}</p>
                <h3 className="font-display font-semibold text-base leading-tight mt-0.5 group-hover:text-primary transition-colors">{p.name}</h3>
                <p className="text-sm text-foreground mt-1">${Number(p.price).toFixed(2)}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: "Tailored by AI", text: "Routines built around your unique hair profile, not a generic chart." },
            { icon: Leaf, title: "Clean formulas", text: "Sulfate-free, silicone-free, cruelty-free. Never tested on animals." },
            { icon: Heart, title: "Saved for life", text: "Your orders, profile and routine — all in one tidy account." },
          ].map((f) => (
            <div key={f.title} className="bg-card p-6 rounded-3xl">
              <f.icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
