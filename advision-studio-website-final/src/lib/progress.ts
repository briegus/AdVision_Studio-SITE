/** Étapes affichées au client pour une demande : Reçue → En cours → Traitée. « Refusée » est un état à part (pas de barre de progression). */
export const STEPS = ["nouvelle", "en_cours", "traitee"] as const;

/** Index de l'étape atteinte (0, 1, 2), ou -1 si le statut n'est pas une étape (refusée, inconnu). */
export function stepIndex(statut: string): number {
  return (STEPS as readonly string[]).indexOf(statut);
}
