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
import Dossiers from "@/pages/dossiers";
import DossierNouveau from "@/pages/dossier-nouveau";
import DossierDetail from "@/pages/dossier-detail";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { isAdminEmail } from "@/lib/admin";
import { AuthProvider, useAuth } from "@/lib/auth";
import { signInPathFor } from "@/lib/redirects";
import SignInPage from "@/pages/auth/sign-in";
import SignUpPage from "@/pages/auth/sign-up";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import ConfirmationPage from "@/pages/auth/confirmation";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  const { isLoaded, user } = useAuth();
  if (!isLoaded) return null;
  return <Redirect to={user ? "/dashboard" : "/accueil"} />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location] = useLocation();
  const { isLoaded, user } = useAuth();
  if (!isLoaded) return null;
  if (!user) return <Redirect to={signInPathFor(location, window.location.search, basePath)} />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isAdminEmail(user?.email)) {
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
const AUTH_PAGES = /^\/(sign-in|sign-up|mot-de-passe-oublie|nouveau-mot-de-passe|auth\/confirmation)(\/|$)/;

function AppRoutes() {
  const [location] = useLocation();
  const isAuthPage    = AUTH_PAGES.test(location);
  const isOnboarding  = /^\/onboarding(\/|$)/.test(location);
  const isStandalone  = /^\/(accueil)(\/|$)/.test(location) || location === "/";

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {/* Auth pages — full-screen, no sidebar */}
        {isAuthPage && (
          <Switch>
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/sign-up" component={SignUpPage} />
            <Route path="/mot-de-passe-oublie" component={ForgotPasswordPage} />
            <Route path="/nouveau-mot-de-passe" component={ResetPasswordPage} />
            <Route path="/auth/confirmation" component={ConfirmationPage} />
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
              <Route path="/dossiers" component={() => <ProtectedRoute component={Dossiers} />} />
              <Route path="/dossiers/nouveau" component={() => <ProtectedRoute component={DossierNouveau} />} />
              <Route path="/dossiers/:id" component={() => <ProtectedRoute component={DossierDetail} />} />
              <Route path="/admin" component={() => <ProtectedRoute component={() => <AdminRoute component={Admin} />} />} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </QueryClientProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <WouterRouter base={basePath}>
        <AppRoutes />
        <InstallPrompt />
      </WouterRouter>
    </LanguageProvider>
  );
}

export default App;
