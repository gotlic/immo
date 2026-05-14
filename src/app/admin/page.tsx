"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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

type InventaireListItem = {
  id: number; appartementId: number; dateEntree: string | null;
  appartement: { id: number; titre: string; adresse: string | null; ville: string | null; etage: number | null };
  etatsDesLieux: { id: number; type: string; status: string; date: string | null }[];
};

type LocataireItem = {
  id: number; token: string; status: string; archived: boolean;
  prenomNom: string | null; mailLocataire: string | null; emailInvitation: string | null;
  tel: string | null; dateDebut: string | null; adresseLocataire: string | null;
  appartement: { id: number; titre: string; adresse: string | null; ville: string | null; etage: number | null };
  inventaireId: number | null;
  edlEntree: { id: number; status: string } | null;
  edlSortie: { id: number; status: string } | null;
};

type Tab = "appartements" | "locataires" | "echanges";
type EchangeSubTab = "baux" | "inventaires";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:       { label: "En attente locataire",  color: "bg-amber-100 text-amber-700" },
  info_submitted:{ label: "En attente garant",     color: "bg-orange-100 text-orange-700" },
  caution_signed:{ label: "En attente signature",  color: "bg-blue-100 text-blue-700" },
  signed_tenant: { label: "À contresigner",        color: "bg-purple-100 text-purple-700" },
  signed_both:   { label: "Signé ✓",              color: "bg-green-100 text-green-700" },
};

function AdminPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appartements, setAppartements] = useState<Appartement[]>([]);
  const [baux, setBaux] = useState<BailListItem[]>([]);
  const [inventaires, setInventaires] = useState<InventaireListItem[]>([]);
  const [locataires, setLocataires] = useState<LocataireItem[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bauxLoading, setBauxLoading] = useState(false);
  const [inventairesLoading, setInventairesLoading] = useState(false);
  const [locatairesLoading, setLocatairesLoading] = useState(false);

  const [activeTab, setActiveTabState] = useState<Tab>((searchParams.get("tab") as Tab) ?? "appartements");
  const [activeSubTab, setActiveSubTab] = useState<EchangeSubTab>((searchParams.get("sub") as EchangeSubTab) ?? "baux");

  function setActiveTab(tab: Tab) {
    setActiveTabState(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  }

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

  // Charger les locataires
  useEffect(() => {
    if (status === "authenticated" && activeTab === "locataires" && locataires.length === 0) {
      setLocatairesLoading(true);
      fetch("/api/locataires")
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => { setLocataires(Array.isArray(data) ? data : []); setLocatairesLoading(false); })
        .catch((err) => { console.error("Locataires fetch error:", err); setLocatairesLoading(false); });
    }
  }, [status, activeTab, locataires.length]);

  // Charger les inventaires
  useEffect(() => {
    if (status === "authenticated" && activeTab === "echanges" && activeSubTab === "inventaires" && inventaires.length === 0) {
      setInventairesLoading(true);
      fetch("/api/inventaires")
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => { setInventaires(Array.isArray(data) ? data : []); setInventairesLoading(false); })
        .catch((err) => { console.error("Inventaires fetch error:", err); setInventairesLoading(false); });
    }
  }, [status, activeTab, activeSubTab, inventaires.length]);

  async function handleArchiveLocataire(id: number, archived: boolean) {
    await fetch(`/api/baux/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    setLocataires((prev) => prev.map((l) => l.id === id ? { ...l, archived } : l));
  }

  async function handleDeleteLocataire(id: number) {
    if (!confirm("Supprimer définitivement ce locataire ? Cette action est irréversible.")) return;
    await fetch(`/api/baux/${id}`, { method: "DELETE" });
    setLocataires((prev) => prev.filter((l) => l.id !== id));
  }

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
              { id: "locataires",   label: "Locataires",   icon: "👤" },
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

        {/* ══ Onglet Locataires ══ */}
        {activeTab === "locataires" && (() => {
          const EDL_BADGE: Record<string, { label: string; bg: string; text: string }> = {
            draft:          { label: "Brouillon",    bg: "bg-gray-100",  text: "text-gray-500" },
            signed_bailleur:{ label: "En attente",   bg: "bg-blue-50",   text: "text-blue-600" },
            signed_both:    { label: "Signé",        bg: "bg-green-50",  text: "text-green-700" },
          };
          const visibles = locataires.filter((l) => showArchived ? l.archived : !l.archived);
          return (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Locataires <span className="text-gray-400 font-normal text-base ml-1">({locataires.filter((l) => !l.archived).length})</span>
                </h2>
                <div className="flex items-center gap-3">
                  {locataires.some((l) => l.archived) && (
                    <button onClick={() => setShowArchived((v) => !v)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                      {showArchived ? "← Actifs" : `Archivés (${locataires.filter((l) => l.archived).length})`}
                    </button>
                  )}
                  <Link
                    href="/admin/locataires/new"
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    + Ajouter
                  </Link>
                </div>
              </div>

              {locatairesLoading ? (
                <div className="text-center py-20 text-gray-400">Chargement…</div>
              ) : visibles.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-4xl mb-3">👤</p>
                  <p>Aucun locataire.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibles.map((loc) => {
                    const email = loc.mailLocataire ?? loc.emailInvitation ?? null;
                    const st = STATUS_LABEL[loc.status] ?? { label: loc.status, color: "bg-gray-100 text-gray-600" };
                    const initials = loc.prenomNom
                      ? loc.prenomNom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                      : "?";
                    return (
                      <div key={loc.id} className={`bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow ${loc.archived ? "opacity-50" : ""}`}>
                        {/* Corps principal */}
                        <div className="p-4 flex items-center gap-4">
                          {/* Avatar initiales */}
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 flex-shrink-0">
                            {initials}
                          </div>

                          {/* Infos principales */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 text-sm">
                                {loc.prenomNom ?? <span className="text-gray-400 font-normal italic">Nom non renseigné</span>}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {email && <span className="text-xs text-gray-400">{email}</span>}
                              {loc.tel && <span className="text-xs text-gray-400">{loc.tel}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500 font-medium">{loc.appartement.titre}</span>
                              {loc.appartement.etage !== null && (
                                <span className="text-xs text-gray-400">{loc.appartement.etage === 0 ? "RDC" : `${loc.appartement.etage}e ét.`}</span>
                              )}
                              {loc.dateDebut && (
                                <span className="text-xs text-gray-400">· depuis {new Date(loc.dateDebut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</span>
                              )}
                            </div>
                          </div>

                          {/* EDL badges */}
                          <div className="hidden sm:flex flex-col gap-1.5 items-end flex-shrink-0">
                            {loc.edlEntree ? (
                              <Link href={`/admin/edl/${loc.edlEntree.id}`} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${EDL_BADGE[loc.edlEntree.status]?.bg} ${EDL_BADGE[loc.edlEntree.status]?.text} hover:opacity-80 transition-opacity`}>
                                🔑 {EDL_BADGE[loc.edlEntree.status]?.label ?? "Entrée"}
                              </Link>
                            ) : loc.inventaireId ? (
                              <Link href={`/admin/edl/new?appartementId=${loc.appartement.id}&type=entree`} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                🔑 + Entrée
                              </Link>
                            ) : null}
                            {loc.edlSortie ? (
                              <Link href={`/admin/edl/${loc.edlSortie.id}`} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${EDL_BADGE[loc.edlSortie.status]?.bg} ${EDL_BADGE[loc.edlSortie.status]?.text} hover:opacity-80 transition-opacity`}>
                                🚪 {EDL_BADGE[loc.edlSortie.status]?.label ?? "Sortie"}
                              </Link>
                            ) : loc.inventaireId ? (
                              <Link href={`/admin/edl/new?appartementId=${loc.appartement.id}&type=sortie`} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                🚪 + Sortie
                              </Link>
                            ) : null}
                          </div>

                        </div>

                        {/* Pied de carte : actions discrètes */}
                        <div className="px-4 pb-3 flex items-center gap-4">
                          <Link href={`/admin/locataires/${loc.id}`} className="text-xs text-gray-400 hover:text-gray-700 transition-colors font-medium">Éditer</Link>
                          <button
                            onClick={() => handleArchiveLocataire(loc.id, !loc.archived)}
                            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            {loc.archived ? "Désarchiver" : "Archiver"}
                          </button>
                          <button
                            onClick={() => handleDeleteLocataire(loc.id)}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors ml-auto"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">États des lieux</h2>
                    <p className="text-sm text-gray-400 mt-1">Entrée et sortie par appartement.</p>
                  </div>
                </div>

                {inventairesLoading ? (
                  <div className="text-center py-20 text-gray-400">Chargement…</div>
                ) : inventaires.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-4xl mb-3">🗂️</p>
                    <p>Aucun inventaire trouvé. Créez d&apos;abord un inventaire pour chaque appartement.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inventaires.map((inv) => {
                      const edlEntree = inv.etatsDesLieux.filter((e) => e.type === "entree");
                      const edlSortie = inv.etatsDesLieux.filter((e) => e.type === "sortie");
                      const lastEntree = edlEntree[edlEntree.length - 1];
                      const lastSortie = edlSortie[edlSortie.length - 1];
                      const EDL_STATUS: Record<string, { label: string; color: string }> = {
                        draft: { label: "Brouillon", color: "bg-gray-100 text-gray-500" },
                        signed_bailleur: { label: "En attente locataire", color: "bg-blue-100 text-blue-700" },
                        signed_both: { label: "Signé ✓", color: "bg-green-100 text-green-700" },
                      };
                      return (
                        <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-medium text-gray-900">{inv.appartement.titre}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {[inv.appartement.adresse, inv.appartement.ville].filter(Boolean).join(", ")}
                                {inv.appartement.etage !== null ? ` · ${inv.appartement.etage === 0 ? "RDC" : `${inv.appartement.etage}e étage`}` : ""}
                                {inv.dateEntree ? ` · Inventaire du ${inv.dateEntree}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {/* Bouton Entrée */}
                              {lastEntree ? (
                                <Link
                                  href={`/admin/edl/${lastEntree.id}`}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-colors hover:shadow-sm ${
                                    EDL_STATUS[lastEntree.status]?.color ?? "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  🔑 Entrée — {EDL_STATUS[lastEntree.status]?.label}
                                </Link>
                              ) : (
                                <Link
                                  href={`/admin/edl/new?appartementId=${inv.appartementId}&type=entree`}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border border-dashed border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800 transition-colors"
                                >
                                  + Entrée
                                </Link>
                              )}

                              {/* Bouton Sortie */}
                              {lastSortie ? (
                                <Link
                                  href={`/admin/edl/${lastSortie.id}`}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-colors hover:shadow-sm ${
                                    EDL_STATUS[lastSortie.status]?.color ?? "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  🚪 Sortie — {EDL_STATUS[lastSortie.status]?.label}
                                </Link>
                              ) : (
                                <Link
                                  href={`/admin/edl/new?appartementId=${inv.appartementId}&type=sortie`}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border border-dashed border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800 transition-colors"
                                >
                                  + Sortie
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>}>
      <AdminPageInner />
    </Suspense>
  );
}
