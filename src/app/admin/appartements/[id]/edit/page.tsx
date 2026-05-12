"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppartementForm from "@/components/AppartementForm";
import BauxList from "@/components/BauxList";
import InventaireEditor from "@/components/InventaireEditor";
import Link from "next/link";

type Appartement = {
  id: number; titre: string; description: string | null; surface: number;
  nbPieces: number; etage: number | null; loyer: number;
  montantCharges: number | null; detailCharges: string | null;
  dpeClasse: string | null; dpePdf: string | null; disponible: boolean;
  specificites: string | null; adresse: string | null; ville: string | null;
  typeBail: string; typeChauffage: string | null; courExtVegetalisee: boolean;
  loyerPrecedentLocataire: number | null; coutEnergMensuel: number | null;
  photos: { id: number; url: string; ordre: number }[];
  videos: { id: number; url: string; type: string }[];
};

type Tab = "description" | "inventaire" | "documents";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "description",  label: "Description",           icon: "🏠" },
  { id: "inventaire",   label: "Inventaire",             icon: "📋" },
  { id: "documents",    label: "Échanges de documents",  icon: "📁" },
];

export default function EditAppartementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [appart, setAppart] = useState<Appartement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("description");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/appartements/${id}`)
        .then((r) => r.json())
        .then((data) => { setAppart(data); setLoading(false); });
    }
  }, [status, id]);

  if (status === "loading" || loading)
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  if (!session || !appart) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">← Retour</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-700 truncate">{appart.titre}</h1>
        </div>

        {/* ── Onglets ──────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Contenu ──────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {activeTab === "description" && (
          <AppartementForm
            appartementId={appart.id}
            initial={{
              titre: appart.titre,
              description: appart.description ?? "",
              surface: String(appart.surface),
              nbPieces: String(appart.nbPieces),
              etage: appart.etage !== null ? String(appart.etage) : "",
              loyer: String(appart.loyer),
              montantCharges: appart.montantCharges !== null ? String(appart.montantCharges) : "",
              detailCharges: appart.detailCharges ?? "",
              dpeClasse: appart.dpeClasse ?? "",
              disponible: appart.disponible,
              specificites: appart.specificites ?? "",
              adresse: appart.adresse ?? "",
              ville: appart.ville ?? "",
              typeBail: appart.typeBail,
              typeChauffage: appart.typeChauffage ?? "",
              courExtVegetalisee: appart.courExtVegetalisee,
              loyerPrecedentLocataire: appart.loyerPrecedentLocataire !== null ? String(appart.loyerPrecedentLocataire) : "",
              coutEnergMensuel: appart.coutEnergMensuel !== null ? String(appart.coutEnergMensuel) : "",
            }}
            initialPhotos={appart.photos}
            initialVideos={appart.videos}
            dpePdfInitial={appart.dpePdf ?? undefined}
          />
        )}

        {activeTab === "inventaire" && (
          <InventaireEditor appartementId={appart.id} titre={appart.titre} />
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <BauxList appartementId={appart.id} />
            <div className="bg-white rounded-xl border border-gray-200 border-dashed p-8 text-center text-sm text-gray-400">
              D&apos;autres types de documents arriveront ici prochainement.
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
