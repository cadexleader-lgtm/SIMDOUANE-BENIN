import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, AuthField, AuthShell, basePath, destinationFromUrl } from "@/components/auth/auth-shell";
import { supabase, useAuth } from "@/lib/auth";
import { authErrorMessage, looksLikeEmail, MIN_PASSWORD_LENGTH } from "@/lib/auth-errors";
import { useMvpTexts } from "@/lib/mvp-texts";
import { onboardingUrl } from "@/lib/redirects";

export default function SignUpPage() {
  const t = useMvpTexts().auth;
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useAuth();
  const destination = destinationFromUrl();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signingUp = useRef(false);

  // Already signed in: nothing to create, go to the page asked for.
  useEffect(() => {
    if (isLoaded && user && !signingUp.current) setLocation(destination ?? "/dashboard", { replace: true });
  }, [isLoaded, user, destination, setLocation]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (form.fullName.trim().length < 2) errors.fullName = t.errors.nameRequired;
    if (!looksLikeEmail(form.email)) errors.email = t.errors.invalidEmail;
    if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = t.errors.weakPassword;
    if (form.confirm !== form.password) errors.confirm = t.errors.passwordMismatch;
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;

    setPending(true);
    signingUp.current = true;
    const next = destination ? `?next=${encodeURIComponent(destination)}` : "";
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
        emailRedirectTo: `${window.location.origin}${basePath}/auth/confirmation${next}`,
      },
    });
    setPending(false);
    if (signUpError) {
      signingUp.current = false;
      setError(authErrorMessage(signUpError, t.errors));
      return;
    }
    // E-mail confirmation turned off (development only): signed in at once,
    // onboarding first, then the page asked for.
    if (data.session) {
      setLocation(onboardingUrl(destination, ""), { replace: true });
      return;
    }
    // With e-mail confirmation on (the normal case) there is no session yet.
    // The same message is shown whether or not the address already had an
    // account, so the form does not reveal who is registered.
    setSentTo(form.email.trim());
  };

  const keep = destination ? `?redirect_url=${encodeURIComponent(destination)}` : "";
  if (sentTo) {
    return (
      <AuthShell title={t.signUp.checkEmailTitle}
        footer={<Link href={`/sign-in${keep}`} className="font-semibold text-[#003D24] hover:underline">{t.signUp.toSignIn}</Link>}>
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <MailCheck className="h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p>{t.signUp.checkEmailText(sentTo)}</p>
            <p className="text-emerald-800/80">{t.signUp.checkSpam}</p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t.signUp.title}
      subtitle={t.signUp.subtitle}
      footer={<>{t.signUp.hasAccount}{" "}<Link href={`/sign-in${keep}`} className="font-semibold text-[#003D24] hover:underline">{t.signUp.toSignIn}</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <AuthField id="fullName" label={t.fullName} placeholder={t.fullNamePlaceholder} autoComplete="name" value={form.fullName}
          onChange={set("fullName")} error={fieldErrors.fullName} />
        <AuthField id="email" label={t.email} type="email" autoComplete="email" inputMode="email" value={form.email}
          onChange={set("email")} error={fieldErrors.email} />
        <AuthField id="password" label={t.password} type="password" autoComplete="new-password" value={form.password}
          onChange={set("password")} error={fieldErrors.password} hint={t.passwordHint} />
        <AuthField id="confirm" label={t.confirmPassword} type="password" autoComplete="new-password" value={form.confirm}
          onChange={set("confirm")} error={fieldErrors.confirm} />
        <AuthError message={error} />
        <Button type="submit" disabled={pending} className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.signUp.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
