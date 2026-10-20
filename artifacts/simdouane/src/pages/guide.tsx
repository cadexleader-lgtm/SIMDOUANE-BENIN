import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLang } from "@/context/language-context";
import { T } from "@/lib/translations";

export default function Guide() {
  const { lang } = useLang();
  const t = T[lang].guide;

  const docs = lang === "fr" ? [
    { key: "BL (Bill of Lading / Connaissement)", desc: "Titre de transport maritime." },
    { key: "Facture commerciale", desc: "Preuve d'achat du véhicule." },
    { key: "AVD (Autorisation de Vente Définitive)", desc: "Pour les véhicules importés à des fins commerciales." },
    { key: "DTAI (Déclaration de Transit et d'Assurance Import)", desc: "Document de suivi de transit." },
    { key: "Certificat d'origine", desc: "Prouvant le pays de fabrication." },
    { key: "ECTN / BESC", desc: "Bordereau Électronique de Suivi des Cargaisons." },
  ] : [
    { key: "Bill of Lading (BL)", desc: "Maritime transport document." },
    { key: "Commercial invoice", desc: "Proof of vehicle purchase." },
    { key: "AVD (Final Sale Authorization)", desc: "For vehicles imported for commercial purposes." },
    { key: "DTAI (Import Transit & Insurance Declaration)", desc: "Transit tracking document." },
    { key: "Certificate of origin", desc: "Proving the country of manufacture." },
    { key: "ECTN / BESC", desc: "Electronic Cargo Tracking Note." },
  ];

  const steps = lang === "fr" ? [
    "Pré-dédouanement (Ouverture du dossier par le CAD)",
    "Dépôt de la déclaration dans SYDONIA",
    "Prise en charge et validation",
    "Scanning du véhicule",
    "Visite douanière (selon circuit)",
    "Paiement des droits et taxes",
    "Obtention du BAE (Bon à Enlever)",
  ] : [
    "Pre-clearance (File opened by the CAD)",
    "Filing the declaration in SYDONIA",
    "Processing and validation",
    "Vehicle X-ray scanning",
    "Customs inspection (per circuit)",
    "Payment of duties and taxes",
    "Obtaining the BAE (Release Order)",
  ];

  const glossary = lang === "fr" ? [
    { term: "GUCE", def: "Guichet Unique du Commerce Extérieur. Plateforme centralisant les formalités." },
    { term: "CAD",  def: "Commissionnaire Agréé en Douane. Professionnel habilité à accomplir les formalités douanières (transitaire)." },
    { term: "SYDONIA", def: "Système Douanier Automatisé. Logiciel de traitement des déclarations douanières." },
    { term: "BFU",  def: "Bordereau de Frais Unique. Facture globale incluant tous les frais portuaires." },
    { term: "DI",   def: "Déclaration d'Importation. Formulaire officiel détaillant la marchandise importée." },
  ] : [
    { term: "GUCE",    def: "Single Window for Foreign Trade. Platform centralizing customs formalities." },
    { term: "CAD",     def: "Approved Customs Broker. Licensed professional authorized to carry out customs formalities (freight forwarder)." },
    { term: "SYDONIA", def: "Automated Customs System. Software for processing customs declarations." },
    { term: "BFU",     def: "Single Fee Schedule. Global invoice including all port fees." },
    { term: "DI",      def: "Import Declaration. Official form detailing imported goods." },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Circuits */}
        <Card>
          <CardHeader><CardTitle>{t.circuits}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { color: "bg-green-500",  title: t.green,  desc: t.greenDesc },
              { color: "bg-yellow-500", title: t.yellow, desc: t.yellowDesc },
              { color: "bg-red-500",    title: t.red,    desc: t.redDesc },
            ].map((c) => (
              <div key={c.title} className="flex gap-4 items-start">
                <div className={`w-4 h-4 rounded-full ${c.color} mt-1 shrink-0`} />
                <div>
                  <strong className="block text-foreground">{c.title}</strong>
                  <span className="text-muted-foreground text-sm">{c.desc}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader><CardTitle>{t.docs}</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              {docs.map((d) => (
                <li key={d.key}>
                  <strong className="text-foreground">{d.key} :</strong> {d.desc}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader><CardTitle>{t.steps}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {steps.map((etape, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-[10px] font-bold text-primary">
                    {idx + 1}
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-card border rounded-lg p-3 shadow-sm text-sm">
                    {etape}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card>
          <CardHeader><CardTitle>{t.glossary}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {glossary.map((g, i) => (
              <div key={g.term}>
                <strong className="text-foreground">{g.term} :</strong>
                <p className="text-sm text-muted-foreground">{g.def}</p>
                {i < glossary.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
