"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateSlash } from "@/lib/bail-utils";

type Bail = {
  id: number; token: string; status: string;
  dateDebut: string | null; prenomNom: string | null; createdAt: string;
};

export default function BauxList({ appartementId }: { appartementId: number }) {
  const [baux, setBaux] = useState<Bail[]>([]);

  useEffect(() => {
    fetch("/api/baux")
      .then((r) => r.json())
      .then((all: (Bail & { appartementId: number })[]) =>
        setBaux(all.filter((b) => b.appartementId === appartementId))
      );
  }, [appartementId]);

  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce bail ?")) return;
    await fetch(`/api/baux/${id}`, { method: "DELETE" });
    setBaux((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Baux</h2>
        <Link
          href={`/admin/baux/new?appart=${appartementId}`}
          className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nouveau bail
        </Link>
      </div>

      {baux.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun bail créé pour cet appartement.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {baux.map((b) => (
            <li key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {b.prenomNom ?? <span className="italic text-gray-400">Locataire en attente</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Début&nbsp;: {b.dateDebut ? formatDateSlash(b.dateDebut) : "non défini"} &nbsp;·&nbsp;
                  Créé le {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  b.status === "signed_both"    ? "bg-green-100 text-green-700"  :
                  b.status === "signed_tenant"  ? "bg-blue-100 text-blue-700"   :
                  b.status === "caution_signed" ? "bg-blue-50 text-blue-600"    :
                  b.status === "info_submitted" ? "bg-orange-100 text-orange-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {b.status === "signed_both"    ? "✅ Signé" :
                   b.status === "signed_tenant"  ? "✍️ Locataire signé" :
                   b.status === "caution_signed" ? "✅ Caution signée" :
                   b.status === "info_submitted" ? "📨 Garant notifié" :
                   "⏳ En attente"}
                </span>
                <Link href={`/admin/baux/${b.id}`} className="text-sm text-blue-600 hover:underline">
                  Voir / Imprimer
                </Link>
                <button onClick={() => handleDelete(b.id)} className="text-sm text-red-500 hover:text-red-700">
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
