"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import BailDocument, { BailDocumentData } from "@/components/BailDocument";
import { Suspense } from "react";

type BailInfo = {
  status: string;
  dateDebut: string | null;
  irlTrimestre: string | null;
  irlValeur: string | null;
  loyerReference: string | null;
  loyerReferenceMaj: string | null;
  prenomNom: string | null;
  dateNaissance: string | null;
  villeNaissance: string | null;
  departementNaissance: string | null;
  adresseLocataire: string | null;
  tel: string | null;
  mailLocataire: string | null;
  garantCivilite: string | null;
  garantPrenomNom: string | null;
  garantDateNaissance: string | null;
  garantAdresse: string | null;
  appartement: {
    titre: string;
    adresse: string | null;
    ville: string | null;
    etage: number | null;
    surface: number;
    nbPieces: number;
    loyer: number;
    montantCharges: number | null;
    detailCharges: string | null;
    dpePdf: string | null;
    typeChauffage: string | null;
    courExtVegetalisee: boolean;
    loyerPrecedentLocataire: number | null;
    coutEnergMensuel: number | null;
    inventaire: {
      dateEntree: string | null;
      lignes: string;
      remarqueCuisine: string | null;
      remarqueSDB: string | null;
      remarquePiece: string | null;
      remarqueGeneral: string | null;
    } | null;
  };
};

function BailViewContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const fromGarant = searchParams.get("from") === "garant";

  const [bail, setBail] = useState<BailInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bail/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setBail(data); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>
  );

  if (!bail) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Document introuvable.</p>
    </div>
  );

  const a = bail.appartement;

  const docData: BailDocumentData = {
    adresse: a.adresse, ville: a.ville, etage: a.etage,
    surface: a.surface, nbPieces: a.nbPieces,
    loyer: a.loyer, montantCharges: a.montantCharges, detailCharges: a.detailCharges,
    dateDebut: bail.dateDebut, irlTrimestre: bail.irlTrimestre, irlValeur: bail.irlValeur,
    loyerReference: bail.loyerReference, loyerReferenceMaj: bail.loyerReferenceMaj,
    prenomNom: bail.prenomNom, dateNaissance: bail.dateNaissance,
    villeNaissance: bail.villeNaissance, departementNaissance: bail.departementNaissance,
    adresseLocataire: bail.adresseLocataire, tel: bail.tel, mailLocataire: bail.mailLocataire,
    garantCivilite: bail.garantCivilite, garantPrenomNom: bail.garantPrenomNom,
    garantDateNaissance: bail.garantDateNaissance, garantAdresse: bail.garantAdresse,
    typeChauffage: a.typeChauffage, courExtVegetalisee: a.courExtVegetalisee,
    loyerPrecedentLocataire: a.loyerPrecedentLocataire, coutEnergMensuel: a.coutEnergMensuel,
    dpePdf: a.dpePdf,
    inventaire: a.inventaire,
    cautionData: null,
    garantLieu: null,
    signatureCaution: null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bandeau */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Consultation — Contrat de location</p>
            <p className="text-sm font-medium text-gray-800">{a.titre}</p>
          </div>
          <div className="flex items-center gap-3">
            {fromGarant && (
              <p className="text-xs text-gray-400 italic hidden sm:block">
                Lecture seule — revenez à l'acte de caution pour signer
              </p>
            )}
            <button
              onClick={() => window.print()}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              🖨 Imprimer / PDF
            </button>
            <button
              onClick={() => window.close()}
              className="text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 transition-colors"
            >
              ← Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 print:p-0">
        <BailDocument data={docData} />
      </div>
    </div>
  );
}

export default function BailViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>}>
      <BailViewContent />
    </Suspense>
  );
}
