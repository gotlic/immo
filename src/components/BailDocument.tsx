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
import CautionDocument, { CautionDocumentData } from "@/components/CautionDocument";

// ─── Type partagé (data) ───────────────────────────────────────────────────────
export type BailDocumentData = {
  // Appartement
  adresse: string | null;
  ville: string | null;
  etage: number | null;
  surface: number;
  nbPieces: number;
  loyer: number;
  montantCharges: number | null;
  detailCharges: string | null;

  // Métadonnées bail
  dateDebut: string | null;
  irlTrimestre: string | null;
  irlValeur: string | null;
  loyerReference: string | null;
  loyerReferenceMaj: string | null;

  // Locataire
  prenomNom: string | null;
  dateNaissance: string | null;
  villeNaissance?: string | null;
  departementNaissance?: string | null;
  adresseLocataire: string | null;
  tel: string | null;
  mailLocataire: string | null;

  // Garant
  garantCivilite: string | null;
  garantPrenomNom: string | null;
  garantDateNaissance: string | null;
  garantAdresse: string | null;

  // Appartement extras
  typeChauffage: string | null;
  courExtVegetalisee: boolean;
  loyerPrecedentLocataire: number | null;
  coutEnergMensuel: number | null;

  // DPE
  dpePdf: string | null;

  // Annexes physiques (optionnel)
  inventaire?: {
    dateEntree: string | null;
    lignes: string; // JSON
    remarqueCuisine?: string | null;
    remarqueSDB?: string | null;
    remarquePiece?: string | null;
    remarqueGeneral?: string | null;
  } | null;
  cautionData?: CautionDocumentData | null;
  garantLieu?: string | null;
  signatureCaution?: string | null;
  signatureCautionAt?: string | null;
};

// ─── Props du routeur ─────────────────────────────────────────────────────────
type Props = {
  typeBail: string;
  data: BailDocumentData;
  /** Slot de signature pour le bailleur (pass null pour espace vide, undefined pour placeholder tirets) */
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
