/**
 * Texts of the screens added for the MVP (accounts, transitaire access).
 * French only for now; to translate, add an `en` object with the same keys
 * and pick it from the language context in `useMvpTexts`.
 */
const fr = {
  common: {
    save: "Enregistrer",
    saved: "Enregistré",
    cancel: "Annuler",
    loading: "Chargement…",
    open: "Ouvrir",
    reason: "Motif",
    reasonOptional: "Motif (facultatif)",
    errorGeneric: "Une erreur est survenue. Réessayez.",
  },
  accountKind: {
    title: "Type de compte",
    particulier: "Particulier",
    entreprise: "Entreprise",
    legalName: "Raison sociale",
    legalNamePlaceholder: "Ex. : Auto Import SARL",
    ifu: "IFU (facultatif)",
    ifuPlaceholder: "Numéro d'identifiant fiscal unique",
    help: "Le type de compte sert à préparer vos futurs dossiers. Il ne donne aucun droit particulier.",
  },
  transitaire: {
    title: "Accès transitaire",
    status: {
      none: "Aucun accès transitaire",
      pending: "Demande en cours d'examen",
      active: "Accès transitaire actif",
      suspended: "Accès suspendu",
      revoked: "Accès révoqué",
    },
    intro:
      "Les fonctions réservées aux transitaires ne sont ouvertes qu'après vérification de vos justificatifs par l'administrateur SimDouane.",
    disclaimer:
      "La validation par SimDouane indique que vos justificatifs ont été examinés. Ce n'est pas une certification officielle de votre agrément.",
    posteNote: "Le poste indiqué dans votre profil n'ouvre aucun accès transitaire.",
    agrementNumber: "Numéro d'agrément déclaré",
    agrementPlaceholder: "Tel qu'il figure sur votre agrément",
    message: "Message pour l'administrateur (facultatif)",
    submit: "Envoyer la demande",
    documents: "Justificatifs",
    documentsHelp: "PDF, JPEG ou PNG, 10 Mo maximum, 5 fichiers au plus. Ils restent privés.",
    addDocument: "Ajouter un justificatif",
    noDocument: "Aucun justificatif. Au moins un est nécessaire pour que la demande puisse être approuvée.",
    decisionReason: "Motif de la décision",
    suspendedHelp: "Votre accès est suspendu. Contactez l'administrateur.",
    applyAgain: "Faire une nouvelle demande",
    history: "Demandes précédentes",
    applicationStatus: { submitted: "En cours d'examen", approved: "Approuvée", rejected: "Refusée" },
  },
  files: {
    tooLarge: "Le fichier dépasse 10 Mo.",
    badType: "Formats acceptés : PDF, JPEG, PNG.",
    uploading: "Envoi…",
  },
  admin: {
    tab: "Transitaires",
    applications: "Demandes d'accès",
    filters: { submitted: "À examiner", approved: "Approuvées", rejected: "Refusées", all: "Toutes" },
    empty: "Aucune demande.",
    applicant: "Demandeur",
    declaredPoste: "Poste déclaré",
    documentsCount: "justificatif(s)",
    openDocument: "Consulter",
    consultationLogged: "Chaque consultation est enregistrée dans le journal.",
    approve: "Approuver",
    approveDisclaimer:
      "Approuver confirme que SimDouane a examiné les justificatifs. Ce n'est pas une certification officielle de l'agrément.",
    reject: "Refuser",
    decisions: "Historique des décisions",
    decisionLabels: { approved: "Approuvée", rejected: "Refusée", suspended: "Suspendue", reinstated: "Rétablie", revoked: "Révoquée" },
    accounts: "Comptes transitaires",
    suspend: "Suspendre",
    reinstate: "Rétablir",
    revoke: "Révoquer",
    reasonRequired: "Un motif est obligatoire.",
    journal: "Journal de sécurité (récent)",
    selectApplication: "Sélectionnez une demande pour l'examiner.",
  },
} as const;

export type MvpTexts = typeof fr;

export function useMvpTexts(): MvpTexts {
  return fr;
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

/** Server message (French) when the API sent one. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string } } | null)?.data;
  return data?.message || fallback;
}
