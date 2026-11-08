/**
 * Identité de l'éditeur du site — À COMPLÉTER PAR LE PROPRIÉTAIRE avant la mise en ligne publique.
 * Ces informations sont obligatoires en France (mentions légales, loi pour la confiance dans l'économie numérique).
 * Tant que les crochets « [À COMPLÉTER …] » sont présents, les pages légales sont incomplètes.
 */
export const LEGAL = {
  name:     { fr: "[À COMPLÉTER — nom ou raison sociale]",                         en: "[TO COMPLETE — name or company name]" },
  status:   { fr: "[À COMPLÉTER — statut : micro-entreprise, SASU, association…]", en: "[TO COMPLETE — legal form: sole trader, company, non-profit…]" },
  address:  { fr: "[À COMPLÉTER — adresse postale ou de domiciliation]",           en: "[TO COMPLETE — postal or registered address]" },
  regNo:    { fr: "[À COMPLÉTER — n° SIRET / RCS, ou « non applicable »]",         en: "[TO COMPLETE — registration number, or “not applicable”]" },
  director: { fr: "[À COMPLÉTER — directeur ou directrice de la publication]",     en: "[TO COMPLETE — publication director]" },
  updated:  { fr: "7 novembre 2026",                                                en: "7 November 2026" },
} as const;
