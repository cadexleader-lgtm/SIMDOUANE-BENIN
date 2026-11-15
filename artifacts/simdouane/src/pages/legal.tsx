/**
 * Legal pages: publisher, privacy, terms of use. They only state what the
 * application really does (see docs/SECURITE-DONNEES.md). To be reviewed by a
 * lawyer before the commercial launch.
 */
import type { ReactNode } from "react";
import { Link } from "wouter";
import { SiteShell, usePageMeta } from "@/components/site-shell";

const UPDATED = "15 novembre 2026";
const CONTACT_EMAIL = "hazoumeclarence@gmail.com";

function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  usePageMeta(`${title} — SimDouane Bénin`, intro);
  return (
    <SiteShell>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16" data-testid="legal-page">
        <p className="text-[#008751] text-xs font-bold uppercase tracking-[0.18em] mb-3">Informations légales</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-3">Dernière mise à jour : {UPDATED}</p>
        <p className="mt-6 text-slate-700 leading-relaxed">{intro}</p>
        <div className="mt-8 space-y-8">{children}</div>
        <p className="mt-12 text-sm text-slate-500">
          Voir aussi : <Link href="/mentions-legales" className="underline">Mentions légales</Link> ·{" "}
          <Link href="/confidentialite" className="underline">Confidentialité</Link> ·{" "}
          <Link href="/conditions" className="underline">Conditions d'utilisation</Link>
        </p>
      </article>
    </SiteShell>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-3 text-slate-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:underline">{children}</div>
    </section>
  );
}

const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" intro="Qui édite SimDouane Bénin, qui l'héberge et comment nous contacter.">
      <Block title="Éditeur">
        <p>SimDouane Bénin est édité par HAZOUME AKUEGNON Clarence Alvin, Cotonou, République du Bénin.</p>
        <p>Contact : <Mail /> · +229 56 50 13 48 · +229 41 82 27 30.</p>
      </Block>
      <Block title="Hébergement">
        <p>Le site et son interface de programmation sont hébergés par Cloudflare, Inc. (101 Townsend Street, San Francisco, CA 94107, États-Unis).</p>
        <p>Les comptes, la base de données et les fichiers sont hébergés par Supabase, Inc., dans un centre de données situé en France (région de Paris).</p>
      </Block>
      <Block title="Nature du service">
        <p>
          SimDouane Bénin est un outil d'estimation indépendant. Il n'est pas un service de l'État béninois, de la
          Direction générale des Douanes ni du Port autonome de Cotonou, et n'a pas été validé par eux.
        </p>
      </Block>
      <Block title="Propriété intellectuelle">
        <p>Le nom SimDouane, le logo, les textes et le logiciel appartiennent à l'éditeur. Toute reproduction sans son accord est interdite.</p>
      </Block>
    </LegalPage>
  );
}

export function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" intro="Quelles données SimDouane Bénin traite, pourquoi, et quels sont vos droits.">
      <Block title="Sans compte">
        <p>
          Vos deux premières estimations se font sans compte. Elles sont gardées uniquement dans votre navigateur
          (stockage local de l'appareil) et ne nous sont pas envoyées. Vous pouvez les effacer depuis la page Historique.
        </p>
        <p>
          Pour compter ces estimations gratuites, votre navigateur crée un identifiant aléatoire, gardé sur votre appareil
          (stockage local et cookie) et envoyé à notre serveur avec le nombre d'estimations faites. Cet identifiant ne
          contient ni votre nom, ni votre numéro, ni le contenu de vos estimations.
        </p>
        <p>Pour convertir une devise, le site demande les taux de change à notre serveur ; aucun montant saisi n'est transmis pour cela.</p>
      </Block>
      <Block title="Avec un compte">
        <p>Si vous créez un compte, nous traitons :</p>
        <ul>
          <li>votre nom et votre adresse email ; votre mot de passe est chiffré et nous ne pouvons pas le lire ;</li>
          <li>les informations de profil que vous choisissez de donner (téléphone, WhatsApp, activité, entreprise et IFU) ;</li>
          <li>les simulations que vous enregistrez et vos dossiers véhicules ;</li>
          <li>pour une demande d'abonnement : le numéro Mobile Money, la référence et le montant du paiement que vous déclarez ;</li>
          <li>pour une demande d'accès transitaire : le numéro d'agrément déclaré et les justificatifs que vous déposez ;</li>
          <li>un journal de sécurité (qui a fait quoi, et quand), sans adresse IP.</li>
        </ul>
      </Block>
      <Block title="Pourquoi">
        <p>
          Ces données servent uniquement à faire fonctionner le service : vous connecter, retrouver vos simulations et vos
          dossiers, traiter vos demandes et protéger les comptes. Elles ne sont ni vendues ni utilisées pour de la publicité.
        </p>
      </Block>
      <Block title="Qui y a accès">
        <p>
          Vous, et l'administrateur de SimDouane pour la gestion des comptes et des demandes. Nos prestataires techniques
          hébergent les données : Supabase (base de données et fichiers, en France) et Cloudflare (site). Des données
          peuvent donc être traitées hors du Bénin.
        </p>
      </Block>
      <Block title="Cookies">
        <p>
          SimDouane n'utilise pas de cookie publicitaire ni de traceur d'audience. Le navigateur garde seulement ce qui est
          nécessaire au fonctionnement : votre session de connexion, la langue choisie, votre historique local et
          l'identifiant qui compte les estimations gratuites sans compte.
        </p>
      </Block>
      <Block title="Durée de conservation">
        <p>Les données d'un compte sont conservées tant que le compte existe. Vous pouvez demander sa suppression à tout moment.</p>
      </Block>
      <Block title="Vos droits">
        <p>
          Conformément à la loi n° 2017-20 du 20 avril 2018 portant code du numérique en République du Bénin, vous pouvez
          demander à consulter, corriger ou supprimer vos données, ou vous opposer à leur traitement, en écrivant à <Mail />.
          Vous pouvez aussi saisir l'Autorité de protection des données personnelles (APDP).
        </p>
      </Block>
    </LegalPage>
  );
}

export function Conditions() {
  return (
    <LegalPage title="Conditions d'utilisation" intro="Les règles d'utilisation de SimDouane Bénin. En utilisant le service, vous les acceptez.">
      <Block title="Ce que fait SimDouane">
        <p>
          SimDouane Bénin estime le coût d'importation d'un véhicule au Port de Cotonou à partir des informations que
          vous saisissez, et propose un guide du dédouanement.
        </p>
      </Block>
      <Block title="Une estimation indicative">
        <p>
          Les résultats sont des estimations. Les taux et les frais utilisés n'ont pas été validés par la Direction
          générale des Douanes ; la douane peut retenir une autre valeur pour le véhicule, et les frais réels du port et
          des intermédiaires peuvent être différents.
        </p>
        <p>
          Un résultat de SimDouane n'est ni un devis, ni une liquidation douanière, ni un conseil juridique ou fiscal.
          Avant toute décision d'achat ou de paiement, faites confirmer les montants par un commissionnaire agréé en douane.
        </p>
      </Block>
      <Block title="Responsabilité">
        <p>
          L'éditeur fait de son mieux pour proposer un outil fiable et disponible, sans pouvoir le garantir. Il ne peut pas
          être tenu responsable d'un écart entre une estimation et les montants réellement payés, ni des décisions prises
          sur la base d'une estimation.
        </p>
      </Block>
      <Block title="Compte">
        <p>
          Vous êtes responsable des informations que vous saisissez et de la confidentialité de votre mot de passe. Un
          compte utilisé pour nuire au service ou à d'autres utilisateurs peut être suspendu.
        </p>
      </Block>
      <Block title="Formules payantes">
        <p>
          Deux estimations sont possibles sans compte. Un compte gratuit donne ensuite 3 estimations par mois ; les
          formules payantes en donnent davantage.
          Elles sont activées manuellement, après vérification du paiement Mobile Money que vous déclarez. Les prix sont
          indiqués en FCFA sur la page d'accueil et dans votre espace.
        </p>
      </Block>
      <Block title="Droit applicable">
        <p>Ces conditions sont soumises au droit béninois. Pour toute question : <Mail />.</p>
      </Block>
    </LegalPage>
  );
}
