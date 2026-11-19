import { Link } from "wouter";
import {
  ArrowRight, BadgeCheck, Calculator, Check, ChevronDown, Coins, FileDown, FolderOpen,
  Info, Languages, MapPin, ShieldCheck, Smartphone, Star, Wallet,
} from "lucide-react";
import { calculate } from "@/lib/calculator";
import { SiteShell, usePageMeta } from "@/components/site-shell";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const img = (name: string) => `${base}/img/${name}`;
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

/* Example shown on the home page: calculated by the simulator's own engine,
   so the figures always match what a user would get for the same input. */
const EXAMPLE_CIF = 8_500_000;
const EXAMPLE = calculate({
  marque: "Toyota", modele: "Corolla", annee: 2019, cylindree: "1300-1600", carburant: "Essence",
  valeurCIF: EXAMPLE_CIF, joursAuPort: 20, regime: "Droit commun",
});
const EXAMPLE_PARTS = [
  { label: "Véhicule (valeur CIF)", value: EXAMPLE_CIF, color: "#003D24" },
  { label: "Droits et taxes", value: EXAMPLE.totalDouane, color: "#FCD116" },
  { label: "Port et formalités", value: EXAMPLE.totalPort, color: "#E8112D" },
];

/* ─── Small building blocks ──────────────────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[#008751] text-xs font-bold uppercase tracking-[0.18em] mb-3">{children}</p>;
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center mb-12">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h2>
      {text && <p className="text-slate-600 mt-4 text-base leading-relaxed">{text}</p>}
    </div>
  );
}

/** Example result card (figures from the engine). */
function ExampleCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5 p-5 ${className}`} data-testid="home-example">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">Toyota Corolla · 2019</p>
          <p className="text-xs text-slate-500">20 jours au port · droit commun</p>
        </div>
        <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#008751]/10 text-[#00693f]">Exemple</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden mb-4" aria-hidden="true">
        {EXAMPLE_PARTS.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / EXAMPLE.totalGeneral) * 100}%`, backgroundColor: p.color }} />
        ))}
      </div>
      <ul className="space-y-2.5">
        {EXAMPLE_PARTS.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-600 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">{fcfa(p.value)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-slate-600">Coût total estimé</span>
        <span className="text-2xl font-extrabold text-[#003D24] tabular-nums whitespace-nowrap" data-testid="home-example-total">
          {fcfa(EXAMPLE.totalGeneral)}
        </span>
      </div>
    </div>
  );
}

/* ─── Illustrations (drawn for SimDouane, brand colours) ─────────────────── */
function PortScene() {
  return (
    <svg viewBox="0 0 480 300" className="w-full h-auto" role="img" aria-label="Un navire décharge des véhicules au port">
      <rect width="480" height="300" rx="24" fill="#EAF4EE" />
      <circle cx="396" cy="62" r="26" fill="#FCD116" />
      {/* sea */}
      <path d="M0 204c30-10 50 10 80 0s50 10 80 0 50 10 80 0v96H0z" fill="#BFE0CF" />
      {/* ship */}
      <path d="M22 176h188l-18 40H46z" fill="#003D24" />
      <rect x="54" y="140" width="34" height="36" rx="3" fill="#E8112D" />
      <rect x="92" y="140" width="34" height="36" rx="3" fill="#FCD116" />
      <rect x="130" y="140" width="34" height="36" rx="3" fill="#008751" />
      <rect x="73" y="104" width="34" height="36" rx="3" fill="#008751" />
      <rect x="111" y="104" width="34" height="36" rx="3" fill="#E8112D" />
      <rect x="170" y="150" width="22" height="26" rx="3" fill="#fff" />
      {/* quay */}
      <rect x="228" y="212" width="252" height="88" fill="#CBD5D0" />
      <rect x="228" y="212" width="252" height="8" fill="#003D24" />
      {/* crane */}
      <rect x="262" y="70" width="10" height="142" fill="#003D24" />
      <rect x="196" y="70" width="150" height="10" rx="3" fill="#003D24" />
      <path d="M272 80l52 0-52 44z" fill="none" stroke="#003D24" strokeWidth="4" />
      <line x1="214" y1="80" x2="214" y2="112" stroke="#003D24" strokeWidth="3" />
      <rect x="198" y="112" width="32" height="20" rx="3" fill="#FCD116" />
      {/* car */}
      <g transform="translate(330 168)">
        <path d="M14 22l10-18a8 8 0 0 1 7-4h36a8 8 0 0 1 6 3l14 19z" fill="#008751" />
        <rect x="0" y="20" width="118" height="24" rx="10" fill="#008751" />
        <path d="M30 8h18v14H22zM54 8h14l10 14H54z" fill="#EAF4EE" />
        <circle cx="28" cy="44" r="11" fill="#00170d" /><circle cx="28" cy="44" r="4.5" fill="#CBD5D0" />
        <circle cx="90" cy="44" r="11" fill="#00170d" /><circle cx="90" cy="44" r="4.5" fill="#CBD5D0" />
      </g>
      {/* customs barrier */}
      <rect x="296" y="172" width="12" height="40" rx="3" fill="#fff" stroke="#003D24" strokeWidth="2" />
      <g transform="rotate(-38 302 186)">
        <rect x="302" y="181" width="70" height="9" rx="4.5" fill="#FCD116" />
        <rect x="322" y="181" width="12" height="9" fill="#E8112D" /><rect x="346" y="181" width="12" height="9" fill="#E8112D" />
      </g>
    </svg>
  );
}

function CurrencyVisual() {
  return (
    <div className="rounded-3xl bg-[#EAF4EE] p-6 sm:p-8">
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/5 p-5 max-w-sm mx-auto">
        <p className="text-xs font-semibold text-slate-500 mb-2">Prix d'achat du véhicule</p>
        <div className="flex gap-2">
          <div className="flex-1 h-12 rounded-xl border border-slate-200 px-3 flex items-center text-lg font-bold text-slate-900 tabular-nums">11 500</div>
          <div className="h-12 rounded-xl border border-slate-200 px-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">EUR <ChevronDown className="h-4 w-4 text-slate-400" /></div>
        </div>
        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" /><Coins className="h-4 w-4 text-[#008751]" /><div className="h-px flex-1 bg-slate-200" />
        </div>
        <p className="text-2xl font-extrabold text-[#003D24] tabular-nums">7 543 506 FCFA</p>
        <p className="text-xs text-slate-500 mt-1">1 EUR = 655,957 FCFA (parité fixe)</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["EUR", "USD", "CAD", "GBP", "JPY", "CNY", "KRW", "CHF"].map((c) => (
            <span key={c} className={`text-[11px] font-bold px-2 py-1 rounded-md ${c === "EUR" ? "bg-[#003D24] text-white" : "bg-slate-100 text-slate-600"}`}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressVisual() {
  const steps = [
    { label: "Pas encore arrivé", done: true },
    { label: "En mer", done: true },
    { label: "Au port de Cotonou", done: true, current: true },
  ];
  return (
    <div className="rounded-3xl bg-[#FFF8DC] p-6 sm:p-8">
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/5 p-5 max-w-sm mx-auto">
        <ol className="flex items-start justify-between gap-2 mb-5">
          {steps.map((s, i) => (
            <li key={s.label} className="flex-1 text-center">
              <div className="flex items-center">
                <div className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : "bg-[#008751]"}`} />
                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${s.current ? "bg-[#003D24] text-[#FCD116]" : "bg-[#008751] text-white"}`}>
                  {s.current ? <MapPin className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </div>
                <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? "bg-transparent" : "bg-[#008751]"}`} />
              </div>
              <p className={`text-[11px] mt-2 leading-tight ${s.current ? "font-bold text-slate-900" : "text-slate-500"}`}>{s.label}</p>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#008751]/10 p-3">
            <p className="text-[11px] font-semibold text-[#00693f]">Déjà payé</p>
            <p className="text-base font-extrabold text-slate-900 tabular-nums">5 095 000 F</p>
          </div>
          <div className="rounded-xl bg-[#003D24] p-3">
            <p className="text-[11px] font-semibold text-[#FCD116]">Reste à payer</p>
            <p className="text-base font-extrabold text-white tabular-nums">2 687 700 F</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">Vos montants réels remplacent les estimations.</p>
      </div>
    </div>
  );
}

/* ─── Content ────────────────────────────────────────────────────────────── */
const FEATURE_ROWS = [
  {
    eyebrow: "Le budget complet",
    title: "Tout ce que vous allez payer, pas seulement la douane",
    text: "SimDouane additionne la valeur du véhicule, les droits et taxes de douane et les frais au port (magasinage, manutention, formalités, commissionnaire). Chaque ligne est détaillée.",
    points: ["Détail taxe par taxe", "Frais de port selon le nombre de jours", "Frais après le port rappelés à part"],
    visual: <div className="rounded-3xl bg-[#EAF4EE] p-6 sm:p-8"><ExampleCard className="max-w-sm mx-auto" /></div>,
  },
  {
    eyebrow: "Votre prix, votre devise",
    title: "Saisissez le prix comme vous le connaissez",
    text: "Prix d'achat avec ou sans transport et assurance, valeur CIF déjà connue, ou montant global payé : SimDouane s'adapte. Les montants en devise sont convertis en FCFA, avec le taux utilisé et sa date.",
    points: ["8 devises en plus du FCFA", "Euro à la parité fixe de 655,957", "Taux conservé avec la simulation"],
    visual: <CurrencyVisual />,
  },
  {
    eyebrow: "Où en est votre véhicule",
    title: "Ce qui est déjà payé, ce qu'il reste à prévoir",
    text: "Indiquez si le véhicule n'est pas encore parti, s'il est en mer ou déjà au port, et les montants que vous avez réglés. Vous voyez tout de suite ce qu'il reste à payer.",
    points: ["Trois situations d'importation", "Montants réels à la place des estimations", "Résultat à télécharger en PDF"],
    visual: <ProgressVisual />,
  },
];

const AUDIENCES = [
  { image: "parc-vehicules.webp", alt: "Parc de véhicules importés vu du ciel", title: "Particuliers", text: "Vous achetez une voiture à l'étranger : connaissez le budget total avant de payer le vendeur." },
  { image: "agent-port.webp", alt: "Professionnel au port avec un ordinateur portable", title: "Importateurs et revendeurs", text: "Comparez plusieurs véhicules, gardez l'historique de vos simulations et vos dossiers." },
  { image: "agent-conteneur.webp", alt: "Professionnel au téléphone devant des conteneurs", title: "Transitaires", text: "Donnez à vos clients une première estimation claire, à télécharger en PDF." },
];

const STEPS = [
  { icon: Calculator, title: "Décrivez le véhicule", text: "Marque, année, cylindrée, prix et nombre de jours au port." },
  { icon: Wallet, title: "Lisez votre budget", text: "Le coût total en tête, puis le détail des droits, taxes et frais." },
  { icon: FileDown, title: "Gardez le résultat", text: "Téléchargez le PDF ou retrouvez la simulation dans votre historique." },
];

const PLANS = [
  { name: "Gratuit", price: "0", period: "FCFA", desc: "Pour les particuliers", features: ["3 estimations par mois", "Détail complet du calcul", "Export PDF", "Dossiers véhicules"], cta: "Commencer gratuitement", highlighted: false },
  { name: "Standard", price: "2 500", period: "FCFA / mois", desc: "Pour les transitaires", features: ["30 estimations par mois", "Nom du client sur chaque simulation et sur le PDF", "Historique en ligne, recherche par client"], cta: "Choisir Standard", highlighted: true },
  { name: "Pro", price: "5 000", period: "FCFA / mois", desc: "Pour les transitaires très actifs", features: ["Estimations illimitées", "Tout ce que contient la formule Standard"], cta: "Choisir Pro", highlighted: false },
];

const FAQ = [
  { q: "Le montant affiché est-il le montant officiel ?", a: "Non. SimDouane donne une estimation indicative. Les taux et les frais n'ont pas été validés par la Direction générale des Douanes : le montant final est fixé par la douane, selon la valeur qu'elle retient pour le véhicule. Faites toujours confirmer par un commissionnaire agréé en douane (CAD)." },
  { q: "Faut-il créer un compte ?", a: "Pas pour commencer : vos deux premières estimations se font sans compte. Ensuite, un compte gratuit est demandé ; il donne 3 estimations par mois, enregistrées et retrouvées sur tous vos appareils." },
  { q: "Dans quelles devises puis-je saisir le prix ?", a: "En FCFA, euro, dollar américain, livre sterling, dollar canadien, franc suisse, yen, yuan ou won sud-coréen. L'euro est converti à la parité fixe (655,957 FCFA) ; les autres devises avec le taux de référence de la Banque centrale européenne, dont la date est affichée." },
  { q: "Puis-je installer SimDouane sur mon téléphone ?", a: "Oui. Sur Android, ouvrez le site dans Chrome puis touchez « Installer ». Sur iPhone, ouvrez-le dans Safari, touchez le bouton Partager puis « Sur l'écran d'accueil ». SimDouane s'ouvre ensuite comme une application." },
  { q: "Comment passer à une formule payante ?", a: "Depuis votre espace, page Abonnement : vous envoyez la référence de votre paiement Mobile Money et la formule est activée après vérification." },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Accueil() {
  usePageMeta(
    "SimDouane Bénin — Simulateur du coût d'importation d'un véhicule au Port de Cotonou",
    "Estimez en quelques minutes le coût total d'importation d'un véhicule au Bénin : droits de douane, taxes et frais du Port de Cotonou. Deux estimations gratuites sans compte, résultat en PDF.",
  );

  return (
    <SiteShell>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#F6F4EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20 grid [&>*]:min-w-0 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold text-[#003D24] bg-white rounded-full pl-1.5 pr-3 py-1.5 ring-1 ring-slate-900/5 mb-6">
              <span className="flex h-5 w-8 rounded-full overflow-hidden" aria-hidden="true">
                <span className="w-2/5 bg-[#008751]" />
                <span className="flex-1 flex flex-col"><span className="flex-1 bg-[#FCD116]" /><span className="flex-1 bg-[#E8112D]" /></span>
              </span>
              Importation de véhicules · Port de Cotonou
            </p>
            <h1 className="text-[2.1rem] leading-[1.1] sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900">
              Combien va coûter votre véhicule, <span className="text-[#008751]">une fois sorti du port ?</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              SimDouane estime le coût total d'importation d'un véhicule au Bénin : droits de douane, taxes
              et frais du port. Vos deux premières estimations sont gratuites, sans compte.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/simulateur"
                data-testid="hero-cta"
                className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-2xl text-base font-bold text-white bg-[#003D24] hover:bg-[#00522f] transition-colors shadow-lg shadow-[#003D24]/20"
              >
                <Calculator className="h-5 w-5" /> Simuler mon véhicule
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-2xl text-base font-bold text-[#003D24] bg-white ring-1 ring-slate-900/10 hover:ring-[#003D24]/40 transition"
              >
                Créer un compte gratuit
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm text-slate-500 max-w-xl">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-[#008751]" />
              Estimation indicative, à confirmer auprès d'un commissionnaire agréé en douane (CAD).
            </p>
          </div>

          <div className="relative">
            <img
              src={img("port-vehicules.webp")}
              alt="Véhicules importés alignés sur un terminal portuaire"
              width={1200} height={675}
              className="w-full aspect-[4/3] object-cover rounded-3xl shadow-2xl"
              fetchPriority="high"
            />
            <ExampleCard className="relative -mt-16 mx-4 sm:absolute sm:mt-0 sm:mx-0 sm:-bottom-10 sm:left-auto sm:-right-4 lg:right-auto lg:-left-12 sm:w-[20rem]" />
          </div>
        </div>
      </section>

      {/* ── Facts strip ────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-white">
        <ul className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5">
          {[
            { icon: BadgeCheck, title: "2 essais sans compte", text: "Puis compte gratuit" },
            { icon: Coins, title: "9 monnaies", text: "FCFA et 8 devises" },
            { icon: FileDown, title: "PDF", text: "Résultat à télécharger" },
            { icon: Languages, title: "Français · English", text: "Deux langues" },
          ].map((f) => (
            <li key={f.title} className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-[#EAF4EE] flex items-center justify-center shrink-0"><f.icon className="h-5 w-5 text-[#003D24]" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{f.title}</span>
                <span className="block text-xs text-slate-500">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="scroll-mt-20 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Fonctionnalités" title="Un budget clair avant d'acheter" text="SimDouane vous montre le coût total, explique d'où vient chaque montant et vous dit ce qui reste incertain." />
          <div className="space-y-16 sm:space-y-24">
            {FEATURE_ROWS.map((row, i) => (
              <div key={row.title} className="grid [&>*]:min-w-0 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <Eyebrow>{row.eyebrow}</Eyebrow>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{row.title}</h3>
                  <p className="mt-4 text-slate-600 leading-relaxed">{row.text}</p>
                  <ul className="mt-5 space-y-2.5">
                    {row.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                        <span className="mt-0.5 h-5 w-5 rounded-full bg-[#008751] flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-white" /></span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>{row.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="fonctionnement" className="scroll-mt-20 py-16 sm:py-24 bg-[#F6F4EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid [&>*]:min-w-0 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <PortScene />
          <div>
            <Eyebrow>Fonctionnement</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Trois étapes, quelques minutes</h2>
            <ol className="mt-8 space-y-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="h-12 w-12 rounded-2xl bg-[#003D24] text-[#FCD116] flex items-center justify-center shrink-0 font-extrabold">{i + 1}</span>
                  <span>
                    <span className="flex items-center gap-2 font-bold text-slate-900"><s.icon className="h-4 w-4 text-[#008751]" />{s.title}</span>
                    <span className="block text-sm text-slate-600 mt-1 leading-relaxed">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/simulateur" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#003D24] hover:underline">
              Lancer une simulation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Audiences ──────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Pour qui" title="Pensé pour ceux qui importent" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {AUDIENCES.map((a) => (
              <article key={a.title} className="rounded-3xl overflow-hidden bg-white ring-1 ring-slate-200">
                <img src={img(a.image)} alt={a.alt} loading="lazy" width={900} height={600} className="w-full aspect-[3/2] object-cover" />
                <div className="p-6">
                  <h3 className="text-lg font-extrabold text-slate-900">{a.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{a.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Honesty ────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-3xl bg-[#003D24] text-white p-7 sm:p-12 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#FCD116] mb-3"><ShieldCheck className="h-4 w-4" /> Transparence</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Une estimation, pas une facture</h2>
            <p className="mt-4 text-white/75 leading-relaxed max-w-2xl">
              Les taux et les frais utilisés par SimDouane n'ont pas été validés par la Direction générale des Douanes.
              La douane peut retenir une autre valeur pour votre véhicule. Chaque résultat liste ses hypothèses, et le
              guide vous explique les étapes et les documents à préparer.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            <Link href="/guide" className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-bold bg-[#FCD116] text-[#003D24]">
              <FolderOpen className="h-4 w-4" /> Lire le guide
            </Link>
            <Link href="/procedure" className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-bold ring-1 ring-white/30 text-white">
              Voir la procédure
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="tarifs" className="scroll-mt-20 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Tarifs" title="Gratuit pour commencer" text="Deux estimations sans compte, puis un compte gratuit avec 3 estimations par mois. Les formules payantes en donnent davantage." />
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-7 flex flex-col ${plan.highlighted ? "bg-[#003D24] text-white shadow-2xl shadow-[#003D24]/25" : "bg-white ring-1 ring-slate-200"}`}
              >
                {plan.highlighted && (
                  <p className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 text-[11px] font-bold uppercase tracking-wider bg-[#FCD116] text-[#003D24]">
                    <Star className="h-3 w-3" fill="currentColor" /> Le plus choisi
                  </p>
                )}
                <p className="font-extrabold text-xl">{plan.name}</p>
                <p className={`text-sm mt-1 ${plan.highlighted ? "text-white/60" : "text-slate-500"}`}>{plan.desc}</p>
                <p className="flex items-baseline gap-2 mt-5 mb-6">
                  <span className="text-4xl font-extrabold tabular-nums">{plan.price}</span>
                  <span className={`text-sm font-medium ${plan.highlighted ? "text-white/60" : "text-slate-500"}`}>{plan.period}</span>
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.highlighted ? "text-white/85" : "text-slate-700"}`}>
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlighted ? "text-[#FCD116]" : "text-[#008751]"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`inline-flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold ${plan.highlighted ? "bg-[#FCD116] text-[#003D24]" : "bg-[#003D24] text-white"}`}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">Paiement par Mobile Money, activation après vérification. Aucune carte bancaire demandée.</p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="questions" className="scroll-mt-20 py-16 sm:py-24 bg-[#F6F4EC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Questions fréquentes" title="Ce qu'on nous demande souvent" />
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white ring-1 ring-slate-200 open:shadow-md">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final call ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex h-14 w-14 rounded-2xl bg-[#EAF4EE] items-center justify-center mb-6"><Smartphone className="h-7 w-7 text-[#003D24]" /></span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Prêt à connaître votre budget ?</h2>
          <p className="mt-4 text-slate-600">Vos deux premières estimations sont gratuites et sans compte.</p>
          <Link
            href="/simulateur"
            className="mt-8 inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl text-base font-bold text-white bg-[#003D24] hover:bg-[#00522f] transition-colors shadow-lg shadow-[#003D24]/20"
          >
            <Calculator className="h-5 w-5" /> Simuler mon véhicule
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
