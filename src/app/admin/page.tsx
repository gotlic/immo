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

type BailListItem = {
  id: number; token: string; status: string;
  dateDebut: string | null; prenomNom: string | null; pasDeGarant: boolean;
  appartement: { titre: string; ville: string | null; adresse: string | null };
};

type Tab = "appartements" | "echanges";
type EchangeSubTab = "baux" | "inventaires";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:       { label: "En attente locataire",  color: "bg-amber-100 text-amber-700" },
  info_submitted:{ label: "En attente garant",     color: "bg-orange-100 text-orange-700" },
  caution_signed:{ label: "En attente signature",  color: "bg-blue-100 text-blue-700" },
  signed_tenant: { label: "À contresigner",        color: "bg-purple-100 text-purple-700" },
  signed_both:   { label: "Signé ✓",              color: "bg-green-100 text-green-700" },
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appartements, setAppartements] = useState<Appartement[]>([]);
  const [baux, setBaux] = useState<BailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bauxLoading, setBauxLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("appartements");
  const [activeSubTab, setActiveSubTab] = useState<EchangeSubTab>("baux");

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

  // Charger les baux quand on arrive sur cet onglet
  useEffect(() => {
    if (status === "authenticated" && activeTab === "echanges" && activeSubTab === "baux" && baux.length === 0) {
      setBauxLoading(true);
      fetch("/api/baux")
        .then((r) => r.json())
        .then((data) => { setBaux(data); setBauxLoading(false); });
    }
  }, [status, activeTab, activeSubTab, baux.length]);

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
      {/* ── En-tête ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
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

        {/* ── Onglets niveau 1 ── */}
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {([
              { id: "appartements", label: "Appartements", icon: "🏠" },
              { id: "echanges",     label: "Échanges de documents", icon: "📋" },
            ] as { id: Tab; label: string; icon: string }[]).map((tab) => (
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

        {/* ── Sous-onglets (Échanges) ── */}
        {activeTab === "echanges" && (
          <div className="max-w-6xl mx-auto px-4 bg-gray-50 border-t border-gray-100">
            <nav className="flex gap-1 overflow-x-auto">
              {([
                { id: "baux",       label: "Baux",        icon: "📝" },
                { id: "inventaires",label: "Inventaires", icon: "🗂️" },
              ] as { id: EchangeSubTab; label: string; icon: string }[]).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeSubTab === sub.id
                      ? "border-gray-700 text-gray-800 font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span className="text-xs">{sub.icon}</span>
                  {sub.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* ══ Onglet Appartements ══ */}
        {activeTab === "appartements" && (
          <>
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
                  const groups = new Map<string, Appartement[]>();
                  for (const a of appartements) {
                    const key = ([a.adresse, a.ville].filter(Boolean).join(", ") || "Sans adresse").toLowerCase();
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(a);
                  }
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
                                  <Image src={appart.photos[0].url} alt="" fill sizes="80px" className="object-cover" unoptimized={appart.photos[0].url.startsWith("/uploads/")} />
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
                              <Link href={`/admin/appartements/${appart.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                Editer
                              </Link>
                              <button onClick={() => handleDelete(appart.id)} className="text-sm text-red-500 hover:text-red-700">
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
          </>
        )}

        {/* ══ Onglet Échanges de documents ══ */}
        {activeTab === "echanges" && (

          <>
            {/* ─ Sous-onglet Baux ─ */}
            {activeSubTab === "baux" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Baux <span className="text-gray-400 font-normal text-base">({baux.length})</span>
                  </h2>
                  <Link
                    href="/admin/baux/new"
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    + Nouveau bail
                  </Link>
                </div>

                {bauxLoading ? (
                  <div className="text-center py-20 text-gray-400">Chargement…</div>
                ) : baux.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p>Aucun bail. Créez-en un depuis un appartement.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {baux.map((bail) => {
                      const st = STATUS_LABEL[bail.status] ?? { label: bail.status, color: "bg-gray-100 text-gray-600" };
                      return (
                        <Link
                          key={bail.id}
                          href={`/admin/baux/${bail.id}`}
                          className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-gray-400 hover:shadow-sm transition-all group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900 truncate">
                                {bail.prenomNom ?? <span className="italic text-gray-400 font-normal">Locataire non renseigné</span>}
                              </p>
                              {bail.pasDeGarant && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">sans garant</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {bail.appartement.titre}
                              {bail.appartement.ville ? ` · ${bail.appartement.ville}` : ""}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {bail.dateDebut
                                ? `Début : ${new Date(bail.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                                : "Date de début non définie"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                              {st.label}
                            </span>
                            <span className="text-gray-300 group-hover:text-gray-600 transition-colors">→</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Bouton discret vers les modèles */}
                <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
                  <Link
                    href="/admin/baux/templates"
                    className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg px-4 py-2 transition-colors"
                  >
                    📄 Modèles de baux
                  </Link>
                </div>
              </>
            )}

            {/* ─ Sous-onglet Inventaires ─ */}
            {activeSubTab === "inventaires" && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Inventaires</h2>
                  <p className="text-sm text-gray-400 mt-1">États des lieux d'entrée et de sortie.</p>
                </div>
                <div className="text-center py-20 text-gray-400">
                  <p className="text-4xl mb-3">🗂️</p>
                  <p className="font-medium">Section à venir</p>
                  <p className="text-sm mt-1">Les inventaires seront accessibles ici prochainement.</p>
                </div>
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}
