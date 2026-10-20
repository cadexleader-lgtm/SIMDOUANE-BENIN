import { Link, useLocation } from "wouter";
import {
  Calculator, BookOpen, History as HistoryIcon, Info, Phone, Mail,
  MessageCircle, FileText, LayoutDashboard, CreditCard, UserCircle,
  LogOut, Shield, LogIn, ChevronRight, Globe,
} from "lucide-react";
import { ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SimDouaneLogo } from "@/components/logo";
import { useLang, Lang } from "@/context/language-context";
import { T } from "@/lib/translations";
import { useUser, useClerk } from "@clerk/react";

const SIDEBAR_BG = "#003D24";
const CONTENT_BG = "#F0F2F5";

/* ─── Lang toggle ────────────────────────────────────────────────────────── */
function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-lg overflow-hidden border border-slate-200 shrink-0">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
            lang === l
              ? "bg-[#003D24] text-[#FCD116]"
              : "text-slate-400 hover:text-slate-600 bg-white"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/* ─── Contact modal ──────────────────────────────────────────────────────── */
function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const t = T[lang].layout;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{t.contactTitle}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{t.contactSubtitle}</p>
        </DialogHeader>
        <div className="mt-1 rounded-xl border bg-primary/5 p-4 space-y-0.5">
          <p className="font-bold text-sm">HAZOUME AKUEGNON Clarence Alvin</p>
          <p className="text-xs text-muted-foreground">{t.founder}</p>
        </div>
        <div className="space-y-3 pt-1">
          {[
            { label: "+229 56 50 13 48", tel: "+22956501348", wa: "22956501348" },
            { label: "+229 41 82 27 30", tel: "+22941822730", wa: "22941822730" },
          ].map((c) => (
            <div key={c.tel} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">WhatsApp / {t.call}</p>
                <p className="text-sm font-semibold">{c.label}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a href={`tel:${c.tel}`}>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1">
                    <Phone className="h-3.5 w-3.5" />{t.call}
                  </Button>
                </a>
                <a href={`https://wa.me/${c.wa}`} target="_blank" rel="noreferrer">
                  <Button size="sm" className="h-8 px-2.5 text-xs gap-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0">
                    <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <p className="text-[10px] text-muted-foreground">{t.email}</p>
              <p className="text-sm font-semibold">hazoumeclarence@gmail.com</p>
            </div>
            <a href="mailto:hazoumeclarence@gmail.com">
              <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1 shrink-0">
                <Mail className="h-3.5 w-3.5" />{t.email}
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── User dropdown (desktop top bar) ───────────────────────────────────── */
function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!user) return null;

  const initials = (user.fullName || user.firstName || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
      >
        {user.imageUrl ? (
          <img src={user.imageUrl} className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200" alt="" />
        ) : (
          <span className="h-8 w-8 rounded-full bg-[#003D24] text-[#FCD116] text-xs font-bold flex items-center justify-center ring-2 ring-slate-200">
            {initials}
          </span>
        )}
        <div className="text-left hidden lg:block">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{user.fullName || user.firstName || "Mon compte"}</p>
          <p className="text-[10px] text-slate-400 leading-tight">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
        <ChevronRight className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-800 truncate">{user.fullName || "Mon compte"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-slate-400" />
              Dashboard
            </Link>
            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <UserCircle className="h-4 w-4 text-slate-400" />
              Mon profil
            </Link>
            <Link
              href="/abonnement"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-slate-400" />
              Abonnement
            </Link>
          </div>
          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar nav item ───────────────────────────────────────────────────── */
function NavItem({ path, icon: Icon, label, active }: {
  path: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link
      href={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-white/15 text-white"
          : "text-white/55 hover:bg-white/[0.07] hover:text-white/85"
      )}
    >
      <span className={cn(
        "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
        active ? "bg-[#FCD116]/20" : "bg-white/[0.06]"
      )}>
        <Icon className={cn("h-3.5 w-3.5", active ? "text-[#FCD116]" : "")} />
      </span>
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FCD116] shrink-0" />}
    </Link>
  );
}

/* ─── Layout ─────────────────────────────────────────────────────────────── */
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [contactOpen, setContactOpen]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang } = useLang();
  const t = T[lang];
  const { user } = useUser();
  const { signOut } = useClerk();

  const isAdmin = user?.emailAddresses?.some(e => e.emailAddress === 'hazoumeclarence@gmail.com');

  const toolsNav = [
    { path: "/simulateur", icon: Calculator,   label: t.nav.simulation },
    { path: "/historique", icon: HistoryIcon,  label: t.nav.history },
    { path: "/guide",      icon: BookOpen,     label: t.nav.guide },
    { path: "/procedure",  icon: FileText,     label: t.nav.procedure },
    { path: "/a-propos",   icon: Info,         label: t.nav.about },
  ];

  const accountNav = [
    { path: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
    { path: "/abonnement", icon: CreditCard,       label: lang === "fr" ? "Abonnement" : "Subscription" },
    { path: "/profil",     icon: UserCircle,       label: lang === "fr" ? "Mon profil" : "My profile" },
    ...(isAdmin ? [{ path: "/admin", icon: Shield, label: "Administration" }] : []),
  ];

  const PAGE_TITLES: Record<string, string> = {
    "/simulateur": t.nav.simulation,
    "/resultats":  lang === "fr" ? "Résultats de simulation" : "Simulation results",
    "/historique": t.nav.history,
    "/guide":      t.nav.guide,
    "/procedure":  t.nav.procedure,
    "/a-propos":   t.nav.about,
    "/dashboard":  "Dashboard",
    "/abonnement": lang === "fr" ? "Mon abonnement" : "My subscription",
    "/profil":     lang === "fr" ? "Mon profil" : "My profile",
    "/admin":      "Administration",
  };

  const isActive = (path: string) =>
    location === path || (location === "/" && path === "/simulateur");

  const pageTitle = PAGE_TITLES[location] ?? "SimDouane";

  const mobileNavItems = [
    { path: "/simulateur", icon: Calculator,  label: t.nav.simulation.split(" ")[0] },
    { path: "/historique", icon: HistoryIcon, label: t.nav.history },
    { path: "/guide",      icon: BookOpen,    label: "Guide" },
    user
      ? { path: "/dashboard", icon: LayoutDashboard, label: "Mon espace" }
      : { path: "/sign-in",   icon: LogIn,            label: "Connexion" },
  ];

  const initials = user
    ? (user.fullName || user.firstName || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  return (
    <div className="min-h-[100dvh] flex" style={{ backgroundColor: CONTENT_BG }}>

      {/* ══ SIDEBAR ════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col z-40"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="rounded-xl p-1.5 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <SimDouaneLogo size={36} />
          </div>
          <div>
            <p className="font-black text-white text-sm tracking-[0.15em] leading-none">SIMDOUANE</p>
            <p className="text-white/35 text-[9px] mt-1 font-medium tracking-wider uppercase">Douane · Bénin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">

          {/* Mon espace (si connecté) */}
          {user && (
            <div className="mb-4">
              <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
                {lang === "fr" ? "Mon espace" : "My space"}
              </p>
              {accountNav.map((item) => (
                <NavItem key={item.path} {...item} active={isActive(item.path)} />
              ))}
            </div>
          )}

          {/* Outils */}
          <div>
            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
              {lang === "fr" ? "Outils" : "Tools"}
            </p>
            {toolsNav.map((item) => (
              <NavItem key={item.path} {...item} active={isActive(item.path)} />
            ))}
          </div>
        </nav>

        {/* User section / CTA */}
        <div className="px-2.5 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {user ? (
            <div className="pt-3 space-y-2">
              {/* Avatar + name */}
              <div className="flex items-center gap-2.5 px-2">
                {user.imageUrl ? (
                  <img src={user.imageUrl} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20 shrink-0" alt="" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-[#FCD116]/15 border border-[#FCD116]/30 text-[#FCD116] text-xs font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate leading-tight">
                    {user.fullName || user.firstName || "Utilisateur"}
                  </p>
                  <p className="text-white/40 text-[10px] truncate leading-tight">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
              {/* Sign out */}
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                {lang === "fr" ? "Déconnexion" : "Sign out"}
              </button>
            </div>
          ) : (
            <div className="pt-3">
              <Link
                href="/sign-in"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(252,209,22,0.12)", border: "1px solid rgba(252,209,22,0.25)", color: "#FCD116" }}
              >
                <LogIn className="h-4 w-4" />
                {lang === "fr" ? "Se connecter" : "Sign in"}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ══ MAIN COLUMN ════════════════════════════════════════════════════ */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-[100dvh]">

        {/* ── Mobile header ── */}
        <header
          className="md:hidden flex items-center justify-between px-4 shrink-0"
          style={{ backgroundColor: SIDEBAR_BG, height: 60 }}
        >
          <div className="flex items-center gap-2.5">
            <SimDouaneLogo size={28} />
            <p className="font-black text-white text-base tracking-widest">SIMDOUANE</p>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <Phone className="h-4 w-4 text-white/80" />
            </button>
            {/* Avatar ouvre le menu mobile */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 overflow-hidden ring-2 transition-all"
                style={{ ringColor: "rgba(252,209,22,0.4)" }}
              >
                {user.imageUrl ? (
                  <img src={user.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center bg-[#FCD116] text-[#003D24] text-xs font-black">
                    {initials}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {/* ── Desktop top bar ── */}
        <header
          className="hidden md:flex items-center justify-between shrink-0 px-7"
          style={{
            backgroundColor: "#FFFFFF",
            height: 56,
            borderBottom: "1px solid #E8EDF2",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              SimDouane
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800">{pageTitle}</span>
          </div>

          {/* Right: lang + contact + user */}
          <div className="flex items-center gap-3">
            <LangToggle />
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Phone className="h-3.5 w-3.5" />
              {t.layout.contact}
            </button>
            {user ? (
              <UserMenu />
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-all"
                style={{ backgroundColor: "#003D24" }}
              >
                <LogIn className="h-3.5 w-3.5" />
                {lang === "fr" ? "Se connecter" : "Sign in"}
              </Link>
            )}
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          className="flex-1 px-4 py-5 md:px-7 md:py-6 pb-24 md:pb-10"
          style={{ backgroundColor: CONTENT_BG }}
        >
          {children}
        </main>

        {/* ── Footer (desktop) ── */}
        <footer className="hidden md:block shrink-0">
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #FCD116 0%, #008751 40%, #E8112D 100%)" }} />
          <div style={{ backgroundColor: SIDEBAR_BG }}>
            <div className="px-8 py-7 grid grid-cols-3 gap-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <SimDouaneLogo size={30} />
                  <div>
                    <p className="font-black text-white text-sm tracking-widest">SIMDOUANE</p>
                    <p className="text-white/30 text-[9px] uppercase tracking-wider">Bénin · 2026</p>
                  </div>
                </div>
                <p className="text-white/40 text-xs leading-relaxed">{t.layout.footerDesc}</p>
              </div>
              <div className="space-y-3">
                <p className="text-[#FCD116]/60 text-[9px] font-bold uppercase tracking-widest">Contact</p>
                {[
                  { icon: Phone, text: "+229 56 50 13 48", href: "tel:+22956501348" },
                  { icon: Phone, text: "+229 41 82 27 30", href: "tel:+22941822730" },
                  { icon: Mail,  text: "hazoumeclarence@gmail.com", href: "mailto:hazoumeclarence@gmail.com" },
                ].map((c) => (
                  <a key={c.href} href={c.href} className="flex items-center gap-2 group">
                    <c.icon className="h-3 w-3 text-white/30 group-hover:text-[#FCD116] transition-colors shrink-0" />
                    <span className="text-white/45 text-xs group-hover:text-white/80 transition-colors">{c.text}</span>
                  </a>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-[#FCD116]/60 text-[9px] font-bold uppercase tracking-widest">{t.about.createdBy}</p>
                <div
                  className="rounded-xl p-3.5 space-y-1"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-white font-bold text-sm leading-snug">HAZOUME AKUEGNON<br />Clarence Alvin</p>
                  <p className="text-white/40 text-xs pt-0.5">{t.layout.founder}</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-3 flex items-center justify-between">
              <p className="text-white/25 text-[10px]">© 2026 SimDouane Bénin. {t.layout.rights}</p>
              <p className="text-white/20 text-[10px] italic">{t.layout.disclaimer}</p>
            </div>
          </div>
        </footer>
      </div>

      {/* ══ MOBILE BOTTOM NAV ══════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 flex items-stretch z-50"
        style={{ height: 58, backgroundColor: "#FFFFFF", borderTop: "1px solid #E8EDF2", boxShadow: "0 -2px 12px rgba(0,0,0,0.07)" }}
      >
        {mobileNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative transition-colors"
              style={{ color: active ? SIDEBAR_BG : "#94A3B8" }}
            >
              {active && (
                <span
                  className="absolute top-0 inset-x-4 h-0.5 rounded-b-full"
                  style={{ background: "#003D24" }}
                />
              )}
              <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.6} />
              <span className="text-[9px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* ══ MOBILE USER DRAWER ════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sheet */}
          <div
            className="md:hidden fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* User info */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
              {user?.imageUrl ? (
                <img src={user.imageUrl} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-slate-100" alt="" />
              ) : (
                <span className="h-12 w-12 rounded-2xl bg-[#003D24] text-[#FCD116] text-base font-black flex items-center justify-center ring-2 ring-slate-100">
                  {initials}
                </span>
              )}
              <div>
                <p className="font-bold text-slate-900 text-sm">{user?.fullName || user?.firstName || "Mon compte"}</p>
                <p className="text-slate-400 text-xs truncate max-w-[220px]">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>

            {/* Nav links */}
            <div className="px-3 py-2">
              {[
                { icon: LayoutDashboard, label: "Dashboard",   path: "/dashboard" },
                { icon: UserCircle,      label: "Mon profil",  path: "/profil" },
                { icon: CreditCard,      label: "Abonnement",  path: "/abonnement" },
                ...(isAdmin ? [{ icon: Shield, label: "Administration", path: "/admin" }] : []),
              ].map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Déconnexion */}
            <div className="px-3 pb-4 pt-1" style={{ borderTop: "1px solid #F1F5F9" }}>
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  {lang === "fr" ? "Se déconnecter" : "Sign out"}
                </span>
              </button>
            </div>

            {/* Safe area bottom spacing */}
            <div className="h-6" />
          </div>
        </>
      )}
    </div>
  );
}
