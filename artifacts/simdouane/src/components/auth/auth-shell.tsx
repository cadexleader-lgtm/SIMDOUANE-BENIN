import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeAppPath } from "@/lib/redirects";
import { useMvpTexts } from "@/lib/mvp-texts";

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Page the visitor was heading to (protected page, invitation link), if safe. */
export function destinationFromUrl(param = "redirect_url"): string | null {
  return safeAppPath(new URLSearchParams(window.location.search).get(param), basePath, window.location.origin);
}

/** Full-screen frame of the sign-in pages (no sidebar). */
export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useMvpTexts().auth;
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#003D24] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={`${basePath}/logo.svg`} className="h-14 mx-auto mb-3" alt="SimDouane" />
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">{t.tagline}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </div>
          {footer && <div className="bg-slate-50 border-t border-slate-200 px-6 sm:px-8 py-4 text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function AuthField({ id, label, error, hint, ...input }: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-slate-700 text-sm font-medium">{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="h-11 rounded-xl border-slate-200 bg-slate-50 text-base sm:text-sm"
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}
