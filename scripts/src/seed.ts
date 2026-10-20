import { db } from "@workspace/db";
import { subscriptionPlansTable } from "@workspace/db";

async function seed() {
  const existing = await db.select().from(subscriptionPlansTable);
  if (existing.length > 0) {
    console.log("Plans already seeded:", existing.length);
    process.exit(0);
  }

  await db.insert(subscriptionPlansTable).values([
    {
      name: "Gratuit",
      slug: "gratuit",
      priceMonthly: "0",
      simulationsPerMonth: 3,
      features: JSON.stringify([
        "3 simulations par mois",
        "Calcul des droits de douane",
        "Résultats instantanés",
      ]) as any,
      isActive: true,
    },
    {
      name: "Standard",
      slug: "standard",
      priceMonthly: "2500",
      simulationsPerMonth: null,
      features: JSON.stringify([
        "Simulations illimitées",
        "Historique complet en ligne",
        "Export PDF",
        "Support par email",
      ]) as any,
      isActive: true,
    },
    {
      name: "Pro",
      slug: "pro",
      priceMonthly: "5000",
      simulationsPerMonth: null,
      features: JSON.stringify([
        "Simulations illimitées",
        "Historique complet en ligne",
        "Export PDF avancé",
        "Support prioritaire WhatsApp",
        "Accès API (bientôt)",
        "Notifications SMS",
      ]) as any,
      isActive: true,
    },
  ]);

  console.log("Subscription plans seeded successfully");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
