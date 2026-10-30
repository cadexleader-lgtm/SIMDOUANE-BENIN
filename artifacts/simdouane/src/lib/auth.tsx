/**
 * Session (Supabase Auth). The browser client only uses the publishable key,
 * which gives access to sign-in and nothing else: the data tables and the
 * file storage are closed to it. All data goes through the API, which checks
 * the access token sent in the Authorization header on every call.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
if (!url || !publishableKey) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Current access token (refreshed by supabase-js when it expires), or null. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// Every API call made by the generated client carries the token (no cookie).
setAuthTokenGetter(getAccessToken);

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  /** No profile photo for now (kept for the layout's avatar slot). */
  imageUrl: null;
};

function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" && metadata.full_name.trim() ? metadata.full_name.trim() : null;
  return { id: user.id, email: user.email ?? "", fullName, firstName: fullName ? fullName.split(/\s+/)[0] : null, imageUrl: null };
}

type AuthState = {
  /** False until the stored session (or a link from an e-mail) has been read. */
  isLoaded: boolean;
  user: AuthUser | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoaded(true);
    });
    // Only update state here: calling other supabase methods inside this
    // callback can dead-lock the client.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoaded(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!isLoaded) return;
    // Another account (or none): drop the cached API data of the previous one.
    if (previousUserId.current !== undefined && previousUserId.current !== userId) queryClient.clear();
    previousUserId.current = userId;
  }, [isLoaded, userId]);

  const value = useMemo<AuthState>(
    () => ({
      isLoaded,
      user: toAuthUser(session?.user),
      // This device only; other devices stay signed in.
      signOut: async () => {
        await supabase.auth.signOut({ scope: "local" });
      },
    }),
    [isLoaded, session],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
