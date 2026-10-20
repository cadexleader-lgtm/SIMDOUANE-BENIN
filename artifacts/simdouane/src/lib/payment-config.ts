/**
 * Single source for the Mobile Money instructions shown to customers.
 *
 * Payment numbers are intentionally left empty until the administrator
 * provides a verified merchant number. Never invent or infer a payment
 * number from a personal contact number.
 */
export const PAYMENT_CONFIG = {
  enabled: false,
  accountLabel: "Coordonnées Mobile Money à confirmer",
  phone: "",
  operators: ["MTN MoMo", "Moov Money", "Celtiis Cash"] as const,
  instructions:
    "Les coordonnées de paiement seront confirmées par l'administrateur avant tout règlement. Aucun paiement automatique n'est activé.",
} as const;

export type MobileMoneyOperator = (typeof PAYMENT_CONFIG.operators)[number];