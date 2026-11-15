/**
 * Frame of the public pages (home, legal pages): header, footer, page title.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, Mail, Menu, Phone, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SimDouaneLogo } from "@/components/logo";

export const SITE_NAME = "SimDouane Bénin";

/** Sets the browser tab title and the description while the page is shown. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.content;
    document.title = title;
    if (meta && description) meta.content = description;
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
    };
  }, [title, description]);
}

export function Wordmark({ light = false, size = 34 }: { light?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <SimDouaneLogo size={size} />
      <span className={`font-extrabold text-lg tracking-tight ${light ? "text-white" : "text-[#003D24]"}`}>
        SimDouane
      </span>
    </span>
  );
}

const NAV = [
  { href: "/accueil#fonctionnement", label: "Fonctionnement" },
  { href: "/accueil#fonctionnalites", label: "Fonctionnalités" },
  { href: "/accueil#tarifs", label: "Tarifs" },
  { href: "/accueil#questions", label: "Questions" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/accueil" aria-label="SimDouane — accueil" data-testid="site-logo">
          <Wordmark />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {NAV.map((n) => (
            <a key={n.href} href={`${base}${n.href}`} className="hover:text-[#003D24] transition-colors">{n.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-[#003D24] px-3 py-2">
              Mon espace
            </Link>
          ) : (
            <Link href="/sign-in" className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-[#003D24] px-3 py-2">
              Se connecter
            </Link>
          )}
          <Link
            href="/simulateur"
            data-testid="header-cta"
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 h-10 rounded-xl text-white bg-[#003D24] hover:bg-[#00522f] transition-colors"
          >
            Simuler <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            data-testid="site-menu"
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-700"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col" data-testid="site-menu-panel">
          {NAV.map((n) => (
            <a key={n.href} href={`${base}${n.href}`} onClick={() => setOpen(false)} className="py-3 text-base font-medium text-slate-700 border-b border-slate-100">
              {n.label}
            </a>
          ))}
          <Link href={user ? "/dashboard" : "/sign-in"} onClick={() => setOpen(false)} className="py-3 text-base font-semibold text-[#003D24]">
            {user ? "Mon espace" : "Se connecter"}
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-[#00170d] text-white">
      <div className="h-1 flex">
        <div className="flex-1 bg-[#008751]" /><div className="flex-1 bg-[#FCD116]" /><div className="flex-1 bg-[#E8112D]" />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-2">
          <Wordmark light />
          <p className="text-white/50 text-sm leading-relaxed mt-4 max-w-sm">
            Simulateur du coût d'importation d'un véhicule au Port de Cotonou. Estimation indicative,
            à confirmer auprès d'un commissionnaire agréé en douane.
          </p>
          <p className="text-white/40 text-xs mt-4">Créé par HAZOUME AKUEGNON Clarence Alvin</p>
        </div>
        <div>
          <p className="text-[#FCD116] text-xs font-bold uppercase tracking-widest mb-4">Contact</p>
          <ul className="space-y-3 text-sm text-white/70">
            <li><a href="tel:+22956501348" className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4" />+229 56 50 13 48</a></li>
            <li><a href="tel:+22941822730" className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4" />+229 41 82 27 30</a></li>
            <li><a href="mailto:hazoumeclarence@gmail.com" className="inline-flex items-center gap-2 hover:text-white break-all"><Mail className="h-4 w-4 shrink-0" />hazoumeclarence@gmail.com</a></li>
          </ul>
        </div>
        <div>
          <p className="text-[#FCD116] text-xs font-bold uppercase tracking-widest mb-4">SimDouane</p>
          <ul className="space-y-3 text-sm text-white/70">
            <li><Link href="/simulateur" className="hover:text-white">Simulateur</Link></li>
            <li><Link href="/guide" className="hover:text-white">Guide du dédouanement</Link></li>
            <li><Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></li>
            <li><Link href="/confidentialite" className="hover:text-white">Confidentialité</Link></li>
            <li><Link href="/conditions" className="hover:text-white">Conditions d'utilisation</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-white/40">
          <p>© {new Date().getFullYear()} SimDouane Bénin. Tous droits réservés.</p>
          <p>Estimation indicative — non contractuelle</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white font-sans text-slate-900 flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
