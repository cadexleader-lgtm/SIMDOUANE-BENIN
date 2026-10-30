import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, AuthShell, destinationFromUrl } from "@/components/auth/auth-shell";
import { useAuth } from "@/lib/auth";
import { linkError } from "@/lib/auth-links";
import { useMvpTexts } from "@/lib/mvp-texts";
import { onboardingUrl } from "@/lib/redirects";

/**
 * Opened from the confirmation e-mail sent at sign-up: Supabase confirms the
 * address and signs the visitor in, then onboarding, then the page they were
 * heading to (`next`, filtered like every other destination).
 */
export default function ConfirmationPage() {
  const t = useMvpTexts().auth;
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useAuth();
  const [failedLink] = useState(() => linkError(window.location));
  const destination = destinationFromUrl("next");

  if (!isLoaded) {
    return <AuthShell title={t.confirmation.checking}><p className="text-sm text-slate-500">{t.loading}</p></AuthShell>;
  }

  if (failedLink || !user) {
    return (
      <AuthShell title={t.signUp.title}>
        <AuthError message={t.confirmation.failed} />
        <Button asChild className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          <Link href="/sign-in">{t.confirmation.toSignIn}</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t.signUp.title}>
      <p className="flex gap-2 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{t.confirmation.done}</p>
      <Button onClick={() => setLocation(onboardingUrl(destination, ""), { replace: true })}
        className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
        {t.confirmation.continue}
      </Button>
    </AuthShell>
  );
}
