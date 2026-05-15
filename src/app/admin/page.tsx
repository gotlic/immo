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
  appartement: { id: number; titre: string; adresse: string | null; ville: string | null; etage: number | null; loyer: number; montantCharges: number | null };
  inventaireId: number | null;
  edlEntree: { id: number; status: string } | null;
  edlSortie: { id: number; status: string } | null;
};

type PaiementItem = {
  id: number;
  bailId: number;
  mois: string;
  montant: number;
  statut: string; // "attendu" | "paye" | "retard"
  datePaiement: string | null;
  note: string | null;
  bail: {
    id: number;
    prenomNom: string | null;
    mailLocataire: string | null;
    dateDebut: string | null;
    appartement: { id: number; titre: string; loyer: number; montantCharges: number | null };
  };
};

type Tab = "appartements" | "locataires" | "paiements" | "echanges";
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
  const [paiements, setPaiements] = useState<PaiementItem[]>([]);
  const [paiementsLoading, setPaiementsLoading] = useState(false);
  const [moisSelectionne, setMoisSelectionne] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingRow, setEditingRow] = useState<{ bailId: number; mois: string; montant: string; note: string } | null>(null);

  const [activeTab, setActiveTabState] = useState<Tab>((searchParams.get("tab") as Tab) ?? "appartements");
  const [activeSubTab, setActiveSubTab] = useState<EchangeSubTab>((searchParams.get("sub") as EchangeSubTab) ?? "baux");

  function setActiveTab(tab: Tab) {
    setActiveTabState(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
    if (tab === "paiements" && locataires.length === 0) {
      setLocatairesLoading(true);
      fetch("/api/locataires")
        .then((r) => r.json())
        .then((data) => { setLocataires(Array.isArray(data) ? data : []); setLocatairesLoading(false); })
        .catch(() => setLocatairesLoading(false));
    }
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

  // Charger les paiements
  useEffect(() => {
    if (status === "authenticated" && activeTab === "paiements") {
      setPaiementsLoading(true);
      fetch("/api/paiements")
        .then((r) => r.json())
        .then((data) => { setPaiements(Array.isArray(data) ? data : []); setPaiementsLoading(false); })
        .catch(() => setPaiementsLoading(false));
    }
  }, [status, activeTab]);

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

  async function marquerPaye(bailId: number, mois: string, montant: number) {
    const today = new Date().toISOString().split("T")[0];
    const existing = paiements.find((p) => p.bailId === bailId && p.mois === mois);
    if (existing) {
      const res = await fetch(`/api/paiements/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "paye", datePaiement: today }),
      });
      const updated = await res.json();
      setPaiements((prev) => prev.map((p) => p.id === existing.id ? { ...p, ...updated } : p));
    } else {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId, mois, montant, statut: "paye", datePaiement: today }),
      });
      const created = await res.json();
      const bail = locataires.find((l) => l.id === bailId);
      if (bail) {
        setPaiements((prev) => [...prev, {
          ...created,
          bail: {
            id: bail.id, prenomNom: bail.prenomNom, mailLocataire: bail.mailLocataire,
            dateDebut: bail.dateDebut,
            appartement: { id: bail.appartement.id, titre: bail.appartement.titre, loyer: bail.appartement.loyer ?? 0, montantCharges: bail.appartement.montantCharges ?? null },
          },
        }]);
      }
    }
  }

  async function marquerRetard(bailId: number, mois: string, montant: number) {
    const existing = paiements.find((p) => p.bailId === bailId && p.mois === mois);
    if (existing) {
      const res = await fetch(`/api/paiements/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "retard" }),
      });
      const updated = await res.json();
      setPaiements((prev) => prev.map((p) => p.id === existing.id ? { ...p, ...updated } : p));
    } else {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId, mois, montant, statut: "retard" }),
      });
      const created = await res.json();
      const bail = locataires.find((l) => l.id === bailId);
      if (bail) {
        setPaiements((prev) => [...prev, {
          ...created,
          bail: {
            id: bail.id, prenomNom: bail.prenomNom, mailLocataire: bail.mailLocataire,
            dateDebut: bail.dateDebut,
            appartement: { id: bail.appartement.id, titre: bail.appartement.titre, loyer: bail.appartement.loyer ?? 0, montantCharges: bail.appartement.montantCharges ?? null },
          },
        }]);
      }
    }
  }

  function calculerProrata(dateDebut: string | null, loyer: number, charges: number, moisCible: string): { montant: number; estProrata: boolean } {
    if (!dateDebut) return { montant: loyer + charges, estProrata: false };
    const [annee, mois, jour] = dateDebut.split("-").map(Number);
    const [cibleAnnee, cibleMois] = moisCible.split("-").map(Number);
    if (annee !== cibleAnnee || mois !== cibleMois) return { montant: loyer + charges, estProrata: false };
    const joursInMonth = new Date(annee, mois, 0).getDate();
    const joursRestants = joursInMonth - jour + 1;
    const loyerProrata = Math.round((loyer * joursRestants / joursInMonth) * 100) / 100;
    return { montant: loyerProrata + charges, estProrata: jour > 1 };
  }

  async function sauvegarderPaiement(bailId: number, mois: string, montant: number, note: string) {
    const existing = paiements.find((p) => p.bailId === bailId && p.mois === mois);
    const bail = locataires.find((l) => l.id === bailId);
    if (existing) {
      const res = await fetch(`/api/paiements/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant, note: note || null }),
      });
      const updated = await res.json();
      setPaiements((prev) => prev.map((p) => p.id === existing.id ? { ...p, ...updated } : p));
    } else if (bail) {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId, mois, montant, note: note || null, statut: "attendu" }),
      });
      const created = await res.json();
      setPaiements((prev) => [...prev, {
        ...created,
        bail: {
          id: bail.id, prenomNom: bail.prenomNom, mailLocataire: bail.mailLocataire,
          dateDebut: bail.dateDebut,
          appartement: { id: bail.appartement.id, titre: bail.appartement.titre, loyer: bail.appartement.loyer, montantCharges: bail.appartement.montantCharges },
        },
      }]);
    }
    setEditingRow(null);
  }

  async function reinitialiserPaiement(bailId: number, mois: string) {
    const existing = paiements.find((p) => p.bailId === bailId && p.mois === mois);
    if (existing) {
      await fetch(`/api/paiements/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "attendu", datePaiement: null }),
      });
      setPaiements((prev) => prev.map((p) => p.id === existing.id ? { ...p, statut: "attendu", datePaiement: null } : p));
    }
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
              { id: "paiements",    label: "Paiements",    icon: "💰" },
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

        {/* ══ Onglet Paiements ══ */}
        {activeTab === "paiements" && (
          <div className="space-y-4">
            {/* Sélecteur de mois */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm font-medium text-gray-700">Mois :</label>
              <input
                type="month"
                value={moisSelectionne}
                onChange={(e) => setMoisSelectionne(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">
                {locataires.filter((l) => !l.archived && l.status === "signed_both").length} locataire(s) actif(s)
              </span>
            </div>

            {/* ── Dépôts de garantie ── */}
            {!paiementsLoading && !locatairesLoading && locataires.filter((l) => !l.archived && l.status === "signed_both").length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Dépôts de garantie</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Locataire</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Appartement</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Montant (1 mois HC)</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs">Statut</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs">Date réception</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {locataires
                      .filter((l) => !l.archived && l.status === "signed_both")
                      .map((l) => {
                        const pc = paiements.find((p) => p.bailId === l.id && p.mois === "caution");
                        const statut = pc?.statut ?? "attendu";
                        const depot = l.appartement.loyer ?? 0;
                        return (
                          <tr key={l.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-900">{l.prenomNom ?? "—"}</div>
                              <div className="text-xs text-gray-400">{l.mailLocataire ?? l.emailInvitation}</div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs">{l.appartement.titre}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                              {depot > 0 ? `${depot.toFixed(0)} €` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                statut === "paye" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {statut === "paye" ? "✓ Reçu" : "En attente"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                              {pc?.datePaiement ? new Date(pc.datePaiement).toLocaleDateString("fr-FR") : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {statut !== "paye" && (
                                  <button
                                    onClick={() => marquerPaye(l.id, "caution", depot)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                  >
                                    ✓ Reçu
                                  </button>
                                )}
                                {statut === "paye" && (
                                  <button
                                    onClick={() => reinitialiserPaiement(l.id, "caution")}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    ↺
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {paiementsLoading || locatairesLoading ? (
              <div className="text-center py-8 text-gray-400">Chargement…</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Locataire</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Appartement</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Loyer CC</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Date paiement</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {locataires
                      .filter((l) => !l.archived && l.status === "signed_both")
                      .map((l) => {
                        const p = paiements.find((p) => p.bailId === l.id && p.mois === moisSelectionne);
                        const statut = p?.statut ?? "attendu";
                        const loyer = l.appartement.loyer ?? 0;
                        const charges = l.appartement.montantCharges ?? 0;
                        const { montant: montantSuggere, estProrata } = calculerProrata(l.dateDebut, loyer, charges, moisSelectionne);
                        const montantAffiche = p?.montant ?? montantSuggere;
                        const isEditing = editingRow?.bailId === l.id && editingRow?.mois === moisSelectionne;

                        if (isEditing) {
                          return (
                            <tr key={l.id} className="bg-blue-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{l.prenomNom ?? "—"}</div>
                                <div className="text-xs text-gray-400">{l.mailLocataire ?? l.emailInvitation}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm">{l.appartement.titre}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingRow.montant}
                                  onChange={(e) => setEditingRow((r) => r ? { ...r, montant: e.target.value } : r)}
                                  className="w-24 border border-blue-300 rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="text-xs text-gray-500 ml-1">€</span>
                              </td>
                              <td className="px-4 py-3" colSpan={2}>
                                <input
                                  type="text"
                                  placeholder="Note (optionnel)"
                                  value={editingRow.note}
                                  onChange={(e) => setEditingRow((r) => r ? { ...r, note: e.target.value } : r)}
                                  className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => sauvegarderPaiement(l.id, moisSelectionne, parseFloat(editingRow.montant) || 0, editingRow.note)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    ✓ Sauver
                                  </button>
                                  <button
                                    onClick={() => setEditingRow(null)}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={l.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{l.prenomNom ?? "—"}</div>
                              <div className="text-xs text-gray-400">{l.mailLocataire ?? l.emailInvitation}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <div>{l.appartement.titre}</div>
                              <div className="text-xs text-gray-400">{l.appartement.ville}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium text-gray-900">
                                {montantAffiche > 0 ? `${montantAffiche.toFixed(2)} €` : "—"}
                              </span>
                              {estProrata && !p && (
                                <div className="text-xs text-blue-500 mt-0.5">prorata</div>
                              )}
                              {p?.note && (
                                <div className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate">{p.note}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statut === "paye"   ? "bg-green-100 text-green-700" :
                                statut === "retard" ? "bg-red-100 text-red-700" :
                                                     "bg-amber-100 text-amber-700"
                              }`}>
                                {statut === "paye" ? "✓ Payé" : statut === "retard" ? "⚠ Retard" : "En attente"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500 text-xs">
                              {p?.datePaiement ? new Date(p.datePaiement).toLocaleDateString("fr-FR") : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {statut !== "paye" && (
                                  <button
                                    onClick={() => marquerPaye(l.id, moisSelectionne, montantAffiche)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                  >
                                    ✓ Payé
                                  </button>
                                )}
                                {statut !== "retard" && (
                                  <button
                                    onClick={() => marquerRetard(l.id, moisSelectionne, montantAffiche)}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                  >
                                    ⚠ Retard
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingRow({ bailId: l.id, mois: moisSelectionne, montant: montantAffiche.toFixed(2), note: p?.note ?? "" })}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
                                  title="Modifier le montant"
                                >
                                  ✎
                                </button>
                                {statut !== "attendu" && (
                                  <button
                                    onClick={() => reinitialiserPaiement(l.id, moisSelectionne)}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    ↺
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {locataires.filter((l) => !l.archived && l.status === "signed_both").length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          Aucun locataire actif (bail signé des deux côtés)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Historique paiements */}
            {paiements.filter((p) => p.statut === "retard" && p.mois !== "caution").length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-medium text-red-800 mb-2">⚠ Retards de paiement</h3>
                <ul className="space-y-1">
                  {paiements
                    .filter((p) => p.statut === "retard" && p.mois !== "caution")
                    .map((p) => (
                      <li key={p.id} className="text-sm text-red-700">
                        {p.bail.prenomNom} — {p.mois} — {p.montant.toFixed(0)} €
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
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
