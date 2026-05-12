"use client";

// Bail non meublé (nu) — à implémenter.
// Modèle : copier BailMeubleDocument.tsx et adapter les clauses
// (durée 3 ans, pas d'inventaire mobilier, etc.)

import { BailDocumentData } from "@/components/BailDocument";

type Props = {
  data: BailDocumentData;
  bailleurSignatureSlot?: React.ReactNode;
  bailleurSignatureUrl?: string | null;
  bailleurSignatureAt?: string | null;
  locataireSignatureSlot?: React.ReactNode;
  locataireSignatureUrl?: string | null;
  locataireSignatureAt?: string | null;
  locataireIp?: string | null;
};

export default function BailNonMeubleDocument({ data }: Props) {
  return (
    <div className="bail-doc bg-white text-sm text-gray-900 leading-relaxed p-8">
      <div className="text-center space-y-2 py-16 border-2 border-dashed border-amber-300 rounded-xl">
        <p className="text-2xl">🚧</p>
        <p className="font-semibold text-gray-700">Bail non meublé — en cours de rédaction</p>
        <p className="text-xs text-gray-400">
          Ce modèle de bail sera disponible prochainement.<br />
          Utiliser <code className="bg-gray-100 px-1 rounded">BailMeubleDocument.tsx</code> comme base.
        </p>
        <div className="mt-6 text-left max-w-sm mx-auto text-xs text-gray-500 space-y-1">
          <p><strong>Appartement :</strong> {data.adresse ?? "—"}, {data.ville ?? "—"}</p>
          <p><strong>Locataire :</strong> {data.prenomNom ?? "En attente"}</p>
          <p><strong>Date de début :</strong> {data.dateDebut ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
