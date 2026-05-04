"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Appartement = {
  id: number; titre: string; surface: number; nbPieces: number;
  loyer: number; montantCharges: number | null; disponible: boolean;
  adresse: string | null; ville: string | null; etage: number | null;
  photos: { url: string }[];
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appartements, setAppartements] = useState<Appartement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/appartements")
        .then((r) => r.json())
        .then((data) => { setAppartements(data); setLoading(false); });
    }
  }, [status]);

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cet appartement ?")) return;
    await fetch(`/api/appartements/${id}`, { method: "DELETE" });
    setAppartements((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggleDisponible(id: number, current: boolean) {
    const appart = appartements.find((a) => a.id === id);
    if (!appart) return;
    const res = await fetch(`/api/appartements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...appart, disponible: !current }),
    });
    const updated = await res.json();
    setAppartements((prev) => prev.map((a) => (a.id === id ? { ...a, disponible: updated.disponible } : a)));
  }

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">Back office</h1>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← Site public</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-500">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Appartements <span className="text-gray-400 font-normal text-base">({appartements.length})</span>
          </h2>
          <Link
            href="/admin/appartements/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Nouvel appartement
          </Link>
        </div>

        {appartements.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>Aucun appartement. Créez le premier !</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              // Grouper par adresse (clé = "adresse, ville" ou "Sans adresse")
              const groups = new Map<string, Appartement[]>();
              for (const a of appartements) {
                // Normalise la clé en minuscules pour éviter les doublons de casse
                const key = ([a.adresse, a.ville].filter(Boolean).join(", ") || "Sans adresse").toLowerCase();
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(a);
              }
              // Trier chaque groupe par étage croissant (null = 0)
              for (const list of groups.values()) {
                list.sort((a, b) => (a.etage ?? 0) - (b.etage ?? 0));
              }
              return Array.from(groups.entries()).map(([adresse, liste]) => (
                <div key={adresse}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                    📍 {adresse}
                  </h3>
                  <div className="space-y-2">
                    {liste.map((appart) => (
                      <div key={appart.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:contents">
                          <div className="relative h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            {appart.photos[0] ? (
                              <Image src={appart.photos[0].url} alt="" fill sizes="80px" className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-300 text-xl">🏠</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{appart.titre}</p>
                            <p className="text-sm text-gray-500">
                              {appart.surface} m² · {appart.nbPieces} pièce{appart.nbPieces > 1 ? "s" : ""} · {appart.loyer.toLocaleString("fr-FR")} €/mois{appart.montantCharges ? ` + ${appart.montantCharges} € cc` : ""}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {[appart.adresse, appart.ville].filter(Boolean).join(", ")}
                              {appart.etage !== null ? ` · ${appart.etage === 0 ? "RDC" : `${appart.etage}e étage`}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 sm:ml-auto">
                          <button
                            onClick={() => toggleDisponible(appart.id, appart.disponible)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${appart.disponible ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            {appart.disponible ? "Disponible" : "Loué"}
                          </button>
                          <Link
                            href={`/admin/appartements/${appart.id}/edit`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Editer
                          </Link>
                          <button
                            onClick={() => handleDelete(appart.id)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
