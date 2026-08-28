import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";


interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const OAUTH_REDIRECT_KEY = "post-auth-redirect";

/** Extract OAuth tokens returned by the redirect flow (hash or query string). */
function readOAuthTokens() {
  if (typeof window === "undefined") return null;
  const sources = [
    new URLSearchParams(window.location.hash.replace(/^#/, "")),
    new URLSearchParams(window.location.search),
  ];
  for (const params of sources) {
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) return { access_token, refresh_token };
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    const init = async () => {
      const tokens = readOAuthTokens();
      if (tokens) {
        const { data, error } = await supabase.auth.setSession(tokens);
        // Strip tokens from the URL regardless of outcome
        window.history.replaceState({}, "", window.location.pathname);
        if (!error && data.session) {
          setSession(data.session);
          setLoading(false);
          const dest = sessionStorage.getItem(OAUTH_REDIRECT_KEY);
          sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
          if (dest && dest !== window.location.pathname) {
            window.location.replace(dest);
          }
          return;
        }
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    init();

    return () => subscription.unsubscribe();
  }, []);


  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
