import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { InstallPrompt } from "@/components/install-prompt";
import { LanguageProvider, useLang } from "@/context/language-context";
import { T } from "@/lib/translations";
import Simulateur from "@/pages/simulateur";
import Resultats from "@/pages/resultats";
import Guide from "@/pages/guide";
import Historique from "@/pages/historique";
import APropos from "@/pages/a-propos";
import Procedure from "@/pages/procedure";
import Dashboard from "@/pages/dashboard";
import Abonnement from "@/pages/abonnement";
import Profil from "@/pages/profil";
import Admin from "@/pages/admin";
import Accueil from "@/pages/accueil";
import Onboarding from "@/pages/onboarding";

import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { isAdminEmail } from "@/lib/admin";

// An explicitly configured key always wins. Deriving the key from the host is
// only for Replit-managed Clerk instances (one instance per domain).
const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  publishableKeyFromHost(window.location.hostname, undefined);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#003D24",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#dc2626",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#0f172a",
    colorNeutral: "#e2e8f0",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl shadow-2xl w-[440px] max-w-full overflow-hidden border border-slate-200",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold text-xl",
    headerSubtitle: "text-slate-500 text-sm",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 text-sm font-medium",
    footerActionLink: "text-[#003D24] font-semibold hover:underline",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400 text-xs",
    identityPreviewEditButton: "text-[#003D24]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-700",
    logoBox: "flex justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50",
    formButtonPrimary: "bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold",
    formFieldInput: "border-slate-200 bg-slate-50 text-slate-900 rounded-xl",
    footerAction: "bg-slate-50 border-t border-slate-200",
    dividerLine: "bg-slate-200",
    alert: "bg-red-50 border-red-200",
    otpCodeFieldInput: "border-slate-200 text-slate-900",
    formFieldRow: "",
    main: "",
  },
};

/* ─── Auth pages (no layout) ─────────────────────────────────────────────── */
function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#003D24] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={`${window.location.origin}${basePath}/logo.svg`} className="h-14 mx-auto mb-3" alt="SimDouane" />
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Simulateur Douanier · Bénin</p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#003D24] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={`${window.location.origin}${basePath}/logo.svg`} className="h-14 mx-auto mb-3" alt="SimDouane" />
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Simulateur Douanier · Bénin</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

/* ─── Clerk cache invalidation ───────────────────────────────────────────── */
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

/* ─── Route helpers ──────────────────────────────────────────────────────── */
function NotFound() {
  const { lang } = useLang();
  const t = T[lang].layout;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold mb-4">{t.notFound}</h1>
      <a href="/simulateur" className="text-primary hover:underline">{t.backHome}</a>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Redirect to="/accueil" /></Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in"><Component /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const isAdmin = user?.emailAddresses.some(e => isAdminEmail(e.emailAddress));
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
        <a href="/simulateur" className="text-primary hover:underline">Retourner à l'accueil</a>
      </div>
    );
  }
  return <Component />;
}

/* ─── App router — split auth vs. layout ────────────────────────────────── */
function ClerkProviderWithRoutes() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const isAuthPage    = /^\/(sign-in|sign-up)(\/|$)/.test(location);
  const isOnboarding  = /^\/onboarding(\/|$)/.test(location);
  const isStandalone  = /^\/(accueil)(\/|$)/.test(location) || location === "/";

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={`${basePath}/accueil`}
      afterSignUpUrl={`${basePath}/onboarding`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />

        {/* Auth pages — full-screen, no sidebar */}
        {isAuthPage && (
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
          </Switch>
        )}

        {/* Onboarding — full-screen, no sidebar */}
        {isOnboarding && !isAuthPage && (
          <Switch>
            <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
          </Switch>
        )}

        {/* Standalone pages — own layout (landing, etc.) */}
        {isStandalone && !isAuthPage && !isOnboarding && (
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/accueil" component={Accueil} />
          </Switch>
        )}

        {/* App pages — wrapped in sidebar Layout */}
        {!isAuthPage && !isStandalone && !isOnboarding && (
          <Layout>
            <Switch>
              <Route path="/simulateur" component={Simulateur} />
              <Route path="/resultats" component={Resultats} />
              <Route path="/historique" component={Historique} />
              <Route path="/guide" component={Guide} />
              <Route path="/procedure" component={Procedure} />
              <Route path="/a-propos" component={APropos} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/abonnement" component={() => <ProtectedRoute component={Abonnement} />} />
              <Route path="/profil" component={() => <ProtectedRoute component={Profil} />} />
              <Route path="/admin" component={() => <ProtectedRoute component={() => <AdminRoute component={Admin} />} />} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
        <InstallPrompt />
      </WouterRouter>
    </LanguageProvider>
  );
}

export default App;
