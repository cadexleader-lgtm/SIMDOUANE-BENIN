-- Détail des simulations enregistrées (phase S9, 2026-11-01). Strictement
-- additif : une colonne facultative ajoutée, aucune donnée supprimée ni
-- modifiée. Elle conserve la saisie de la valeur du véhicule (cas, montants,
-- devises et taux), la situation du véhicule et les montants déjà payés ; les
-- simulations existantes gardent NULL.
ALTER TABLE "simulations" ADD COLUMN "details" jsonb;