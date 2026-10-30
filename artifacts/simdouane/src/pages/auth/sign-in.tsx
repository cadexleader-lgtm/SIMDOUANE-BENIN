import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, AuthField, AuthShell, destinationFromUrl } from "@/components/auth/auth-shell";
import { supabase, useAuth } from "@/lib/auth";
import { authErrorMessage, looksLikeEmail } from "@/lib/auth-errors";
import { useMvpTexts } from "@/lib/mvp-texts";

export default function SignInPage() {
  const t = useMvpTexts().auth;
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useAuth();
  const destination = destinationFromUrl();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Signed in (now or already): go to the page that was asked for.
  useEffect(() => {
    if (isLoaded && user) setLocation(destination ?? "/dashboard", { replace: true });
  }, [isLoaded, user, destination, setLocation]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!looksLikeEmail(email)) errors.email = t.errors.invalidEmail;
    if (!password) errors.password = t.errors.invalidCredentials;
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    setPending(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (signInError) setError(authErrorMessage(signInError, t.errors));
  };

  const keep = destination ? `?redirect_url=${encodeURIComponent(destination)}` : "";
  return (
    <AuthShell
      title={t.signIn.title}
      subtitle={t.signIn.subtitle}
      footer={<>{t.signIn.noAccount}{" "}<Link href={`/sign-up${keep}`} className="font-semibold text-[#003D24] hover:underline">{t.signIn.toSignUp}</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <AuthField id="email" label={t.email} type="email" autoComplete="email" inputMode="email" value={email}
          onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <AuthField id="password" label={t.password} type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
        <div className="text-right -mt-2">
          <Link href="/mot-de-passe-oublie" className="text-sm text-[#003D24] hover:underline">{t.signIn.forgot}</Link>
        </div>
        <AuthError message={error} />
        <Button type="submit" disabled={pending} className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.signIn.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
