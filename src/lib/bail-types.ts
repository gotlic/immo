/**
 * Types de bail disponibles.
 * Ajouter une entrée ici pour introduire un nouveau type de bail.
 * Le composant associé doit ensuite être créé dans src/components/
 * et référencé dans BailDocument.tsx (le routeur).
 */

export const BAIL_TYPES = [
  { value: "meuble",              label: "Meublé" },
  { value: "non_meuble",          label: "Non meublé" },
  { value: "local_professionnel", label: "Local professionnel" },
] as const;

export type TypeBail = (typeof BAIL_TYPES)[number]["value"];

export function getBailTypeLabel(typeBail: string): string {
  return BAIL_TYPES.find((t) => t.value === typeBail)?.label ?? typeBail;
}
