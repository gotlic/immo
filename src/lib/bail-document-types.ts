import type { CautionDocumentData } from "@/components/CautionDocument";

/**
 * Données communes à tous les types de bail.
 * Source unique de vérité — importée par BailDocument et tous les composants de bail.
 */
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

  // Options bail
  pasDeGarant?: boolean;

  // Annexes (optionnel)
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
