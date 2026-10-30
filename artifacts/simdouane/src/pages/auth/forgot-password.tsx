import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, AuthField, AuthShell, basePath } from "@/components/auth/auth-shell";
import { supabase } from "@/lib/auth";
import { authErrorMessage, looksLikeEmail } from "@/lib/auth-errors";
import { useMvpTexts } from "@/lib/mvp-texts";

export default function ForgotPasswordPage() {
  const t = useMvpTexts().auth;
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!looksLikeEmail(email)) {
      setFieldError(t.errors.invalidEmail);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${basePath}/nouveau-mot-de-passe`,
    });
    setPending(false);
    // Same answer whether or not an account exists; only real failures
    // (network, rate limit, e-mail service) are shown.
    if (resetError && resetError.code !== "user_not_found") setError(authErrorMessage(resetError, t.errors));
    else setSent(true);
  };

  const back = <Link href="/sign-in" className="font-semibold text-[#003D24] hover:underline">{t.forgot.back}</Link>;
  if (sent) {
    return (
      <AuthShell title={t.forgot.sentTitle} footer={back}>
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <MailCheck className="h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p>{t.forgot.sentText}</p>
            <p className="text-emerald-800/80">{t.signUp.checkSpam}</p>
          </div>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t.forgot.title} subtitle={t.forgot.subtitle} footer={back}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <AuthField id="email" label={t.email} type="email" autoComplete="email" inputMode="email" value={email}
          onChange={(e) => setEmail(e.target.value)} error={fieldError} />
        <AuthError message={error} />
        <Button type="submit" disabled={pending} className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.forgot.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
