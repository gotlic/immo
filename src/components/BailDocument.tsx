"use client";

/**
 * BailDocument — routeur de documents de bail.
 *
 * Sélectionne le bon composant de bail selon `typeBail`.
 * Pour ajouter un nouveau type :
 *   1. Créer le composant dans src/components/Bail<Type>Document.tsx
 *   2. L'importer ici et l'ajouter dans BAIL_DOCUMENT_MAP
 *   3. Ajouter la valeur dans src/lib/bail-types.ts
 */

import BailMeubleDocument from "@/components/BailMeubleDocument";
import BailNonMeubleDocument from "@/components/BailNonMeubleDocument";
import BailLocalProfessionnelDocument from "@/components/BailLocalProfessionnelDocument";

// Re-export depuis la source unique de vérité
export type { BailDocumentData } from "@/lib/bail-document-types";
import type { BailDocumentData } from "@/lib/bail-document-types";

// ─── Props du routeur ─────────────────────────────────────────────────────────
type Props = {
  typeBail: string;
  data: BailDocumentData;
  /** Mode modèle : affiche les champs sous forme <<CHAMP>> en orange au lieu des valeurs */
  templateMode?: boolean;
  bailleurSignatureSlot?: React.ReactNode;
  bailleurSignatureUrl?: string | null;
  bailleurSignatureAt?: string | null;
  locataireSignatureSlot?: React.ReactNode;
  locataireSignatureUrl?: string | null;
  locataireSignatureAt?: string | null;
  locataireIp?: string | null;
};

// ─── Table de dispatch ────────────────────────────────────────────────────────
const BAIL_DOCUMENT_MAP: Record<string, React.ComponentType<Omit<Props, "typeBail">>> = {
  meuble:              BailMeubleDocument,
  non_meuble:          BailNonMeubleDocument,
  local_professionnel: BailLocalProfessionnelDocument,
};

// ─── Routeur ──────────────────────────────────────────────────────────────────
export default function BailDocument({ typeBail, ...rest }: Props) {
  const Component = BAIL_DOCUMENT_MAP[typeBail] ?? BailMeubleDocument;
  return <Component {...rest} />;
}
