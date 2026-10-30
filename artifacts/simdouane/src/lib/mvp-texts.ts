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
  auth: {
    tagline: "Simulateur Douanier · Bénin",
    email: "Adresse e-mail",
    password: "Mot de passe",
    passwordHint: "8 caractères minimum",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmez le mot de passe",
    fullName: "Nom complet",
    fullNamePlaceholder: "Ex. : Awa Dossou",
    loading: "Chargement…",
    signIn: {
      title: "Connexion",
      subtitle: "Accédez à votre espace SimDouane.",
      submit: "Se connecter",
      forgot: "Mot de passe oublié ?",
      noAccount: "Pas encore de compte ?",
      toSignUp: "Créer un compte",
    },
    signUp: {
      title: "Créer un compte",
      subtitle: "Gratuit. Une adresse e-mail suffit.",
      submit: "Créer mon compte",
      hasAccount: "Déjà un compte ?",
      toSignIn: "Se connecter",
      checkEmailTitle: "Vérifiez votre boîte e-mail",
      checkEmailText: (email: string) =>
        `Si cette adresse peut être utilisée, un lien de confirmation vient d'être envoyé à ${email}. Ouvrez-le pour activer votre compte.`,
      checkSpam: "Pensez à regarder dans les courriers indésirables.",
    },
    forgot: {
      title: "Mot de passe oublié",
      subtitle: "Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.",
      submit: "Envoyer le lien",
      sentTitle: "E-mail envoyé",
      sentText: "Si un compte existe avec cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe.",
      back: "Retour à la connexion",
    },
    reset: {
      title: "Nouveau mot de passe",
      subtitle: "Choisissez votre nouveau mot de passe.",
      submit: "Enregistrer le mot de passe",
      done: "Mot de passe modifié. Vous êtes connecté.",
      invalidLink: "Ce lien est invalide ou a expiré.",
      requestNew: "Demander un nouveau lien",
    },
    confirmation: {
      checking: "Confirmation de votre adresse…",
      done: "Adresse confirmée. Bienvenue sur SimDouane !",
      continue: "Continuer",
      failed: "Ce lien de confirmation est invalide ou a expiré.",
      toSignIn: "Aller à la connexion",
    },
    changePassword: {
      title: "Mot de passe",
      description: "Choisissez un nouveau mot de passe pour votre compte.",
      submit: "Changer le mot de passe",
      done: "Mot de passe modifié.",
    },
    errors: {
      invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
      emailNotConfirmed: "Votre adresse e-mail n'est pas encore confirmée. Ouvrez le lien reçu par e-mail.",
      alreadyRegistered: "Un compte existe déjà avec cette adresse. Connectez-vous ou utilisez « Mot de passe oublié ».",
      weakPassword: "Mot de passe trop faible : 8 caractères minimum.",
      passwordMismatch: "Les deux mots de passe ne correspondent pas.",
      invalidEmail: "Adresse e-mail invalide.",
      nameRequired: "Indiquez votre nom.",
      rateLimited: "Trop de tentatives. Patientez quelques minutes puis réessayez.",
      emailNotAuthorized:
        "L'envoi d'e-mails n'est pas encore possible vers cette adresse. Contactez l'administrateur SimDouane.",
      samePassword: "Le nouveau mot de passe doit être différent de l'ancien.",
      network: "Connexion impossible. Vérifiez votre connexion Internet et réessayez.",
      generic: "Une erreur est survenue. Réessayez.",
    },
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
  cases: {
    navTitle: "Mes dossiers",
    listTitle: "Mes dossiers véhicules",
    listSubtitle: "Préparez votre dossier d'importation et repérez ce qui manque.",
    disclaimer:
      "SimDouane vous aide à préparer votre dossier. Il n'est pas déposé auprès des Douanes, du GUCE ou de Bénin Control.",
    newCase: "Nouveau dossier",
    empty: "Vous n'avez encore aucun dossier.",
    emptyHelp: "Créez un dossier dès l'achat du véhicule, ou quand il est déjà au port de Cotonou.",
    missingCount: (n: number) => (n === 0 ? "Rien ne manque" : n === 1 ? "1 information manquante" : `${n} informations manquantes`),
    updatedOn: "Modifié le",
    status: {
      draft: "Brouillon",
      incomplete: "Informations à compléter",
      ready: "Prêt pour la préparation administrative",
    },
    statusHelp: {
      draft: "Complétez les informations, puis cliquez sur « Vérifier le dossier ».",
      incomplete: "Il manque des informations pour passer à la préparation administrative.",
      ready:
        "Les informations de base sont réunies pour préparer les formalités avec un transitaire. Ce n'est pas un dépôt officiel.",
    },
    situation: {
      title: "Où se trouve le véhicule ?",
      not_arrived: "Pas encore arrivé au Bénin",
      not_arrivedHelp: "Acheté, en préparation ou en mer. Vous préparez le dossier à l'avance.",
      arrived: "Déjà arrivé au port de Cotonou",
      arrivedHelp: "Le véhicule est au port. Indiquez ce qui a déjà été fait.",
    },
    sections: {
      vehicle: "Véhicule",
      transport: "Provenance et transport",
      arrival: "Arrivée",
      current: "Situation actuelle",
      notes: "Informations complémentaires",
    },
    fields: {
      "vehicle.make": "Marque",
      "vehicle.model": "Modèle",
      "vehicle.year": "Année",
      "vehicle.vin": "Numéro de châssis (VIN)",
      "vehicle.condition": "État",
      originCountry: "Pays de provenance",
      departurePort: "Port de départ",
      shippedAt: "Date d'expédition (prévue ou réelle)",
      estimatedArrivalDate: "Date d'arrivée estimée",
      arrivalDate: "Date d'arrivée au port",
      transportReference: "Référence de transport (ex. connaissement)",
      existingReferences: "Références déjà obtenues",
      formalitiesDone: "Formalités déjà réalisées",
      knownBlockers: "Blocages connus",
      notes: "Notes",
    } as Record<string, string>,
    placeholders: {
      vin: "17 caractères pour la plupart des véhicules récents",
      existingReferences: "Numéros déjà communiqués par votre transitaire ou les services, si vous en avez",
      formalitiesDone: "Ex. : déclaration déjà préparée par mon transitaire",
      knownBlockers: "Ex. : facture finale pas encore reçue",
    },
    condition: { "": "Non précisé", neuf: "Neuf", occasion: "Occasion" },
    optional: "facultatif",
    required: "obligatoire",
    requiredLegend: "Seules la situation et la marque sont obligatoires pour créer le dossier.",
    create: "Créer le dossier",
    back: "Retour",
    save: "Enregistrer",
    saved: "Enregistré",
    check: "Vérifier le dossier",
    archive: "Archiver",
    archiveConfirmTitle: "Archiver ce dossier ?",
    archiveConfirmText: "Il disparaîtra de votre liste. Il est conservé et n'est pas effacé.",
    missingTitle: "À compléter avant la préparation administrative",
    recommendedTitle: "Recommandé",
    history: "Historique",
    events: {
      created: "Dossier créé",
      updated: "Informations modifiées",
      status_changed: "Statut",
      archived: "Dossier archivé",
    } as Record<string, string>,
    notFound: "Dossier introuvable.",
    loadError: "Impossible de charger vos dossiers pour le moment.",
    loadCaseError: "Impossible de charger ce dossier pour le moment.",
    retry: "Réessayer",
    fixErrors: "Certaines informations sont à corriger.",
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
