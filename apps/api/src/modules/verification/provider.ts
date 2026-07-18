/**
 * Abstraction de la vérification d'identité « Gens de Confiance ».
 *
 * Contexte (recherche 2026-07) : GdC expose une API partenaire (base historique
 * « TrustFully », endpoints Membership/Sponsorship/User) MAIS l'accès n'est PAS
 * self-service — il faut un partenariat + une clé API obtenus sur demande.
 * Tant que la clé n'est pas fournie, on utilise le repli manuel (validation admin).
 *
 * Basculer via GDC_PROVIDER=manual|trustfully.
 */

export interface GdcCheckInput {
  /** Identifiant / URL du profil GdC saisi par l'utilisateur. */
  gdcProfile: string;
  /** URL de la preuve uploadée (S3), utilisée par le repli manuel. */
  proofUrl?: string;
}

export interface GdcCheckResult {
  /** true = vérifié automatiquement ; false = en attente d'action. */
  verified: boolean;
  /** true si une validation manuelle par un admin est nécessaire. */
  requiresManualReview: boolean;
  provider: "manual" | "trustfully";
  message: string;
}

export interface IdentityVerificationProvider {
  readonly name: "manual" | "trustfully";
  check(input: GdcCheckInput): Promise<GdcCheckResult>;
}

/**
 * Repli par défaut : aucune vérification automatique possible.
 * La demande est enregistrée en PENDING et validée manuellement par un admin
 * via le back-office.
 */
export class ManualGdcProvider implements IdentityVerificationProvider {
  readonly name = "manual" as const;

  async check(input: GdcCheckInput): Promise<GdcCheckResult> {
    return {
      verified: false,
      requiresManualReview: true,
      provider: "manual",
      message: input.proofUrl
        ? "Preuve reçue. Vérification en attente de validation par un administrateur."
        : "Profil enregistré. Une preuve est requise pour la validation manuelle.",
    };
  }
}

/**
 * Implémentation branchable sur l'API partenaire GdC (« TrustFully »).
 * STUB : nécessite un partenariat + une clé API (GDC_API_KEY). Le contrat
 * d'endpoint réel doit être confirmé auprès de GdC avant activation.
 */
export class TrustFullyGdcProvider implements IdentityVerificationProvider {
  readonly name = "trustfully" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  async check(input: GdcCheckInput): Promise<GdcCheckResult> {
    if (!this.apiKey) {
      // Pas de clé => impossible d'appeler l'API : on retombe sur le manuel.
      return {
        verified: false,
        requiresManualReview: true,
        provider: "trustfully",
        message:
          "Clé API Gens de Confiance absente — repli sur validation manuelle.",
      };
    }

    // TODO(partenariat GdC) : appeler l'endpoint Membership réel une fois le
    // contrat confirmé. Exemple pressenti :
    //   GET {baseUrl}/membership?profile=... avec Authorization: ApiKey {apiKey}
    // Réponse -> { active: boolean }. Ne PAS deviner le format en production.
    throw new Error(
      "TrustFullyGdcProvider non implémenté : contrat d'API partenaire à confirmer avec Gens de Confiance."
    );
  }
}
