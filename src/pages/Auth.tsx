import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      navigate(params.get("redirect") || "/account", { replace: true });
    }
  }, [user, navigate]);

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (error) toast.error(error.message || "Google sign-in failed");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[8%] w-16 h-16 rounded-full bg-primary/10 blur-sm" />
        <div className="absolute top-[20%] right-[12%] w-12 h-12 rounded-lg bg-primary/8 rotate-12 blur-sm" />
        <div className="absolute bottom-[15%] left-[15%] w-10 h-10 rounded-full bg-primary/10 blur-sm" />
        <div className="absolute bottom-[25%] right-[8%] w-14 h-14 rounded-lg bg-primary/6 -rotate-12 blur-sm" />
        <div className="absolute top-[50%] left-[5%] w-8 h-8 rounded-full bg-muted-foreground/5 blur-sm" />
        <div className="absolute top-[40%] right-[5%] w-20 h-20 rounded-full bg-primary/5 blur-md" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <p className="text-muted-foreground mt-2 text-sm font-body">
            Personalized haircare, made for your hair.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <h1 className="text-xl font-heading text-center mb-1">Welcome to YouHair</h1>
          <p className="text-sm text-muted-foreground text-center mb-6 font-body">
            Sign in or create an account with Google.
          </p>

          <Button
            variant="outline"
            className="w-full rounded-full h-11 border-input hover:bg-muted font-medium"
            onClick={handleGoogle}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
