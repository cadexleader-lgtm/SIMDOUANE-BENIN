import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import {
  Calculator, Shield, Clock, Cloud, TrendingUp, CheckCircle,
  ArrowRight, Phone, Mail, Star, Zap, ChevronRight, Lock, FileText,
} from "lucide-react";
import { SimDouaneLogo } from "@/components/logo";
import { useLang } from "@/context/language-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const HERO_IMAGES = [
  `${basePath}/hero1.jpg`,
  `${basePath}/hero2.jpg`,
  `${basePath}/hero3.jpg`,
  `${basePath}/hero4.jpg`,
  `${basePath}/hero5.jpg`,
];

/* Animated number counter */
function CountUp({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <span>{value.toLocaleString("fr-FR")}</span>;
}

/* Floating card with animated values */
function HeroCard({ visible }: { visible: boolean }) {
  const rows = [
    { label: "Valeur CIF",         raw: 8500000,  display: "8 500 000 F" },
    { label: "Droit de douane",    raw: 2125000,  display: "2 125 000 F" },
    { label: "TVA (18%)",          raw: 1827000,  display: "1 827 000 F" },
    { label: "Frais de port (20j)",raw: 136000,   display: "136 000 F"   },
  ];
  return (
    <div
      className="relative w-full max-w-sm mx-auto lg:mx-0"
      style={{
        animation: visible ? "floatCard 0.7s ease-out forwards, floatAnim 4s ease-in-out 1s infinite" : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {/* Glow */}
      <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl" style={{ background: "radial-gradient(ellipse, #FCD116 0%, transparent 70%)" }} />

      {/* Glass card */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(12px)" }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#FCD116] flex items-center justify-center shadow">
              <Calculator className="h-4 w-4 text-[#003D24]" />
            </div>
            <div>
              <p className="text-white text-xs font-bold">Toyota Corolla — 2019</p>
              <p className="text-white/40 text-[10px]">Port de Cotonou · Mise à la conso.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(0,135,81,0.25)", color: "#4ade80" }}>✓ Calculé</span>
        </div>
        {/* Body */}
        <div className="p-5 space-y-3">
          {rows.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-white/50 text-xs">{row.label}</span>
              {visible ? (
                <span className="text-white text-xs font-semibold" style={{ animationDelay: `${i * 180}ms` }}>
                  <CountUp target={row.raw} duration={1200 + i * 150} /> F
                </span>
              ) : (
                <span className="text-white/20 text-xs">…</span>
              )}
            </div>
          ))}
          <div className="pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm font-bold">Total estimé</span>
              {visible ? (
                <span className="text-xl font-black" style={{ color: "#FCD116" }}>
                  <CountUp target={12588000} duration={1800} /> F
                </span>
              ) : (
                <span className="text-white/20 text-xl">…</span>
              )}
            </div>
          </div>
        </div>
        {/* Footer bar */}
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: "rgba(0,0,0,0.2)" }}>
          <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-1 bg-[#FCD116] rounded-full transition-all duration-[2000ms]" style={{ width: visible ? "100%" : "0%" }} />
          </div>
          <span className="text-white/40 text-[10px] font-medium whitespace-nowrap">Résultat en 2 secondes</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Calculator,
    title: "Calcul instantané",
    desc: "Obtenez en quelques secondes une estimation précise des droits de douane et frais portuaires pour tout véhicule importé au Bénin.",
  },
  {
    icon: Shield,
    title: "Formules officielles",
    desc: "Nos calculs sont basés sur les formules réelles de la DGDDI du Bénin. Aucune approximation, seulement des données fiables.",
  },
  {
    icon: Cloud,
    title: "Historique cloud",
    desc: "Toutes vos simulations sont sauvegardées dans le cloud. Retrouvez-les où que vous soyez, sur n'importe quel appareil.",
  },
  {
    icon: TrendingUp,
    title: "Tous les régimes",
    desc: "Import temporaire, mise à la consommation, transit… SimDouane couvre tous les régimes douaniers en vigueur.",
  },
  {
    icon: Clock,
    title: "Disponible 24h/24",
    desc: "Simulez vos importations à toute heure, sans attendre un expert. Idéal pour les transitaires et importateurs actifs.",
  },
  {
    icon: Zap,
    title: "Export PDF",
    desc: "Téléchargez vos résultats en PDF pour les partager facilement avec vos clients ou les présenter en douane.",
  },
];

const PLANS = [
  {
    name: "Gratuit",
    price: "0",
    period: "",
    desc: "Pour découvrir SimDouane",
    quota: "3 simulations / mois",
    features: ["3 simulations mensuelles", "Calcul instantané", "Export PDF", "Guide douanier"],
    cta: "Commencer gratuitement",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "2 500",
    period: "FCFA / mois",
    desc: "Pour les importateurs réguliers",
    quota: "30 simulations / mois",
    features: ["30 simulations mensuelles", "Historique cloud", "Export PDF", "Toutes les fonctionnalités", "Support prioritaire"],
    cta: "Choisir Standard",
    href: "/sign-up",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "5 000",
    period: "FCFA / mois",
    desc: "Pour les transitaires et pros",
    quota: "Simulations illimitées",
    features: ["Simulations illimitées", "Historique complet", "Export PDF", "Toutes les fonctionnalités", "Support dédié", "Accès API (bientôt)"],
    cta: "Choisir Pro",
    href: "/sign-up",
    highlighted: false,
  },
];

const STATS = [
  { value: "500+", label: "Importateurs actifs" },
  { value: "10 000+", label: "Simulations réalisées" },
  { value: "99%", label: "Précision des calculs" },
  { value: "24/7", label: "Disponibilité" },
];

/* ─── Hero Section ───────────────────────────────────────────────────────── */
function HeroSection() {
  const [slide, setSlide] = useState(0);
  const [cardVisible, setCardVisible] = useState(false);

  // Auto-advance slideshow every 5s
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  // Trigger counting animation after short delay
  useEffect(() => {
    const id = setTimeout(() => setCardVisible(true), 600);
    return () => clearTimeout(id);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden pt-16">
      {/* ── Slideshow background ── */}
      <div className="absolute inset-0 z-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-[1500ms]"
            style={{
              opacity: i === slide ? 1 : 0,
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center 25%",
              backgroundRepeat: "no-repeat",
            }}
          />
        ))}
        {/* Multi-layer overlay for legibility */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(0,20,10,0.88) 0%, rgba(0,61,36,0.80) 50%, rgba(0,40,24,0.85) 100%)" }} />
        {/* Subtle geometric accent */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FCD116 0%, transparent 50%), radial-gradient(circle at 80% 20%, #008751 0%, transparent 40%)" }} />
      </div>

      {/* ── Slide indicators ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              height: "3px",
              width: i === slide ? "24px" : "8px",
              background: i === slide ? "#FCD116" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-5 py-16 w-full">
        {/* Benin flag strip */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="h-0.5 w-8 rounded-full bg-[#FCD116]/60" />
          <div className="h-0.5 w-8 rounded-full bg-[#008751]/60" />
          <div className="h-0.5 w-8 rounded-full bg-[#E8112D]/60" />
          <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest ml-1">République du Bénin</span>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* ── Left: copy ── */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
              style={{ backgroundColor: "rgba(252,209,22,0.12)", border: "1px solid rgba(252,209,22,0.25)", color: "#FCD116" }}>
              <Star className="h-3 w-3" fill="currentColor" />
              Le simulateur douanier de référence au Bénin
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Calculez vos<br />
              <span style={{ color: "#FCD116" }}>droits de douane</span><br />
              en secondes.
            </h1>

            <p className="text-white/65 text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              SimDouane Bénin est le simulateur professionnel pour estimer les coûts d'importation
              de véhicules au Port de Cotonou — basé sur les formules officielles de la DGDDI.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-bold text-[#003D24] transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: "#FCD116", boxShadow: "0 8px 24px rgba(252,209,22,0.35)" }}
              >
                Essayer gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/simulateur"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-bold transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.88)" }}
              >
                <Calculator className="h-4 w-4" />
                Simuler sans compte
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              {[
                { icon: Shield, text: "Formules DGDDI officielles" },
                { icon: Lock,   text: "Données sécurisées" },
                { icon: FileText, text: "Export PDF gratuit" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}
                >
                  <Icon className="h-3 w-3 text-[#FCD116]" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: animated glass card ── */}
          <div className="w-full lg:w-96 lg:shrink-0">
            <HeroCard visible={cardVisible} />
          </div>

        </div>

        {/* ── Stats bar ── */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(4px)" }}
            >
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/40 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function Accueil() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SimDouaneLogo size={32} />
            <span className="font-black text-[#003D24] text-base tracking-widest">SIMDOUANE</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#fonctionnalites" className="hover:text-[#003D24] transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-[#003D24] transition-colors">Tarifs</a>
            <a href="#contact" className="hover:text-[#003D24] transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all"
                style={{ backgroundColor: "#003D24" }}
              >
                Mon espace <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-slate-700 hover:text-[#003D24] transition-colors px-3 py-2"
                >
                  Se connecter
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all"
                  style={{ backgroundColor: "#003D24" }}
                >
                  Commencer
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-20 px-5 bg-[#F0F2F5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#003D24] text-xs font-bold uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-500 mt-3 text-base max-w-lg mx-auto">
              SimDouane regroupe tous les outils nécessaires aux importateurs, transitaires et particuliers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#003D24]/20 hover:shadow-md transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{ backgroundColor: "rgba(0,61,36,0.07)" }}
                >
                  <f.icon className="h-5 w-5 text-[#003D24]" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-base">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#003D24] text-xs font-bold uppercase tracking-widest mb-3">Comment ça marche</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-14">
            3 étapes, c'est tout.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Saisissez les infos", desc: "Marque, modèle, année, cylindrée, valeur CIF et durée de séjour au port." },
              { step: "02", title: "Obtenez l'estimation", desc: "SimDouane calcule instantanément tous les droits, taxes et frais portuaires." },
              { step: "03", title: "Téléchargez le PDF", desc: "Exportez votre estimation en PDF pour la partager ou la conserver." },
            ].map((step) => (
              <div key={step.step} className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 font-black text-lg"
                  style={{ backgroundColor: "#003D24", color: "#FCD116" }}
                >
                  {step.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-20 px-5 bg-[#F0F2F5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#003D24] text-xs font-bold uppercase tracking-widest mb-3">Tarifs</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Des plans pour chaque besoin
            </h2>
            <p className="text-slate-500 mt-3 text-base">Commencez gratuitement. Passez au Pro quand vous êtes prêt.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl p-6 border transition-all"
                style={plan.highlighted
                  ? { backgroundColor: "#003D24", border: "2px solid #003D24", boxShadow: "0 20px 48px rgba(0,61,36,0.25)" }
                  : { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }
                }
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: "rgba(252,209,22,0.15)", color: "#FCD116" }}>
                    <Star className="h-2.5 w-2.5" fill="currentColor" /> Le plus populaire
                  </div>
                )}
                <p className={`font-black text-lg mb-1 ${plan.highlighted ? "text-white" : "text-slate-900"}`}>{plan.name}</p>
                <p className={`text-sm mb-4 ${plan.highlighted ? "text-white/50" : "text-slate-400"}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className={`text-4xl font-black ${plan.highlighted ? "text-white" : "text-slate-900"}`}>{plan.price}</span>
                  {plan.period && (
                    <span className={`text-xs font-medium ${plan.highlighted ? "text-white/40" : "text-slate-400"}`}>{plan.period}</span>
                  )}
                </div>
                <div
                  className="rounded-xl px-3.5 py-2 mb-6 text-xs font-semibold text-center"
                  style={plan.highlighted
                    ? { backgroundColor: "rgba(252,209,22,0.12)", color: "#FCD116" }
                    : { backgroundColor: "#F0F2F5", color: "#003D24" }
                  }
                >
                  {plan.quota}
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.highlighted ? "text-white/80" : "text-slate-600"}`}>
                      <CheckCircle className={`h-4 w-4 shrink-0 ${plan.highlighted ? "text-[#FCD116]" : "text-[#003D24]"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all"
                  style={plan.highlighted
                    ? { backgroundColor: "#FCD116", color: "#003D24" }
                    : { backgroundColor: "#003D24", color: "#FFFFFF" }
                  }
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-xs mt-6">Paiement via Mobile Money (MTN, Moov). Aucune carte bancaire requise.</p>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(135deg, #001f12 0%, #003D24 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Prêt à simuler votre importation ?
          </h2>
          <p className="text-white/50 mb-8 text-base">
            Rejoignez des centaines d'importateurs et transitaires qui font confiance à SimDouane.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-[#003D24]"
              style={{ backgroundColor: "#FCD116", boxShadow: "0 8px 24px rgba(252,209,22,0.3)" }}
            >
              Créer un compte gratuit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/simulateur"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
            >
              <Calculator className="h-4 w-4" />
              Simuler sans compte
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer id="contact" style={{ backgroundColor: "#001a0f" }}>
        <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #FCD116 0%, #008751 40%, #E8112D 100%)" }} />
        <div className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <SimDouaneLogo size={28} />
              <span className="font-black text-white text-sm tracking-widest">SIMDOUANE</span>
            </div>
            <p className="text-white/35 text-sm leading-relaxed">
              Simulateur professionnel de droits et frais douaniers pour l'importation de véhicules au Port de Cotonou, Bénin.
            </p>
          </div>
          <div>
            <p className="text-[#FCD116]/60 text-[10px] font-bold uppercase tracking-widest mb-4">Contact</p>
            {[
              { icon: Phone, text: "+229 56 50 13 48", href: "tel:+22956501348" },
              { icon: Phone, text: "+229 41 82 27 30", href: "tel:+22941822730" },
              { icon: Mail, text: "hazoumeclarence@gmail.com", href: "mailto:hazoumeclarence@gmail.com" },
            ].map((c) => (
              <a key={c.href} href={c.href} className="flex items-center gap-2 mb-2.5 group">
                <c.icon className="h-3.5 w-3.5 text-white/30 group-hover:text-[#FCD116] transition-colors" />
                <span className="text-white/45 text-sm group-hover:text-white/80 transition-colors">{c.text}</span>
              </a>
            ))}
          </div>
          <div>
            <p className="text-[#FCD116]/60 text-[10px] font-bold uppercase tracking-widest mb-4">Créateur</p>
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white font-bold text-sm">HAZOUME AKUEGNON Clarence Alvin</p>
              <p className="text-white/40 text-xs mt-1">Fondateur & Expert Douanier</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 px-5 py-4 max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-white/20 text-xs">© 2026 SimDouane Bénin. Tous droits réservés.</p>
          <p className="text-white/15 text-xs italic">Estimation indicative — non contractuelle</p>
        </div>
      </footer>
    </div>
  );
}
