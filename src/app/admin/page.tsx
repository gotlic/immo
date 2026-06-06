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
  mailLocataire: string | null;
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
  loyerHC: number | null;
  chargesMois: number | null;
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
type EchangeSubTab = "baux" | "inventaires" | "quittances";

type EdlItem = {
  id: number; token: string; type: string; status: string;
  date: string | null; locataireNom: string | null; locataireEmail: string | null;
  inventaire: {
    appartementId: number;
    appartement: { titre: string; adresse: string | null; ville: string | null; etage: number | null };
  };
};
type PaiementSubTab = "loyer" | "depot";

type GmailMatch = {
  emailDate: string;
  emailAmount: number;
  emailLibelle: string;
  emailSender: string;
  bailId: number;
  mois: string;
  locataire: string;
  expectedMontant: number;
  existingPaiementId: number | null;
  confidence: "confirmed" | "ambiguous";
  reason?: string;
};

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
  const [paiementSubTab, setPaiementSubTab] = useState<PaiementSubTab>("loyer");
  const [filtreLocataire, setFiltreLocataire] = useState<string>("all");
  const [filtreAnnee, setFiltreAnnee] = useState<string>(String(new Date().getFullYear()));
  const [editingLoyerRow, setEditingLoyerRow] = useState<{
    bailId: number; mois: string;
    loyerHC: string; chargesMois: string;
    statut: string; datePaiement: string; note: string;
  } | null>(null);
  const [editingDepotRow, setEditingDepotRow] = useState<{
    bailId: number; montantRecu: string; datePaiement: string;
  } | null>(null);

  // EDL list + new EDL form
  const [edls, setEdls] = useState<EdlItem[]>([]);
  const [edlsLoading, setEdlsLoading] = useState(false);
  const [showNewEdl, setShowNewEdl] = useState(false);
  const [newEdlType, setNewEdlType] = useState<"entree" | "sortie">("entree");
  const [newEdlInventaireId, setNewEdlInventaireId] = useState("");
  const [newEdlNom, setNewEdlNom] = useState("");
  const [newEdlEmail, setNewEdlEmail] = useState("");
  const [newEdlBauxAppart, setNewEdlBauxAppart] = useState<BailListItem[]>([]);
  const [newEdlSaving, setNewEdlSaving] = useState(false);

  // Quittances form state
  const [qBailId, setQBailId] = useState<string>("");
  const [qModeRange, setQModeRange] = useState(false);
  const [qMois, setQMois] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [qMoisFin, setQMoisFin] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [qSending, setQSending] = useState(false);
  const [qSent, setQSent] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  // Vérification Gmail des règlements
  const [gmailChecking, setGmailChecking] = useState(false);
  const [gmailResult, setGmailResult] = useState<{
    confirmed: GmailMatch[]; ambiguous: GmailMatch[]; noMatch: GmailMatch[];
  } | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSelected, setGmailSelected] = useState<Set<string>>(new Set()); // clé: "bailId-mois"
  const [gmailMatchMap, setGmailMatchMap] = useState<Map<string, GmailMatch>>(new Map());
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailSaved, setGmailSaved] = useState(false);

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

  // Charger les baux quand on arrive sur cet onglet (ou quittances)
  useEffect(() => {
    if (status === "authenticated" && activeTab === "echanges" && (activeSubTab === "baux" || activeSubTab === "quittances") && baux.length === 0) {
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

  // Charger les inventaires + EDLs
  useEffect(() => {
    if (status === "authenticated" && activeTab === "echanges" && activeSubTab === "inventaires") {
      if (inventaires.length === 0) {
        setInventairesLoading(true);
        fetch("/api/inventaires")
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
          .then((data) => { setInventaires(Array.isArray(data) ? data : []); setInventairesLoading(false); })
          .catch((err) => { console.error("Inventaires fetch error:", err); setInventairesLoading(false); });
      }
      if (edls.length === 0) {
        setEdlsLoading(true);
        fetch("/api/etats-des-lieux")
          .then((r) => r.json())
          .then((data) => { setEdls(Array.isArray(data) ? data : []); setEdlsLoading(false); })
          .catch(() => setEdlsLoading(false));
      }
    }
  }, [status, activeTab, activeSubTab, inventaires.length, edls.length]);

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

  function calculerProrata(dateDebut: string | null, loyer: number, charges: number, mois: string): { loyerHC: number; charges: number; estProrata: boolean } {
    if (!dateDebut) return { loyerHC: loyer, charges, estProrata: false };
    const parts = dateDebut.split("-");
    if (parts.length < 3) return { loyerHC: loyer, charges, estProrata: false };
    const yr = parseInt(parts[0]), mo = parseInt(parts[1]), day = parseInt(parts[2]);
    const moisDebut = `${yr}-${String(mo).padStart(2, "0")}`;
    if (mois !== moisDebut || day <= 1) return { loyerHC: loyer, charges, estProrata: false };
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const ratio = (daysInMonth - day + 1) / daysInMonth;
    return {
      loyerHC: Math.round(loyer * ratio * 100) / 100,
      charges: Math.round(charges * ratio * 100) / 100,
      estProrata: true,
    };
  }

  function generateMoisDisponibles(dateDebut: string | null): string[] {
    if (!dateDebut) return [];
    const parts = dateDebut.split("-");
    if (parts.length < 2) return [];
    let yr = parseInt(parts[0]), mo = parseInt(parts[1]);
    const now = new Date();
    const cy = now.getFullYear(), cm = now.getMonth() + 1;
    const months: string[] = [];
    while (yr < cy || (yr === cy && mo <= cm)) {
      months.push(`${yr}-${String(mo).padStart(2, "0")}`);
      mo++; if (mo > 12) { mo = 1; yr++; }
    }
    return months;
  }

  function getAnneesDisponibles(): string[] {
    const years = new Set<string>();
    locataires
      .filter((l) => !l.archived && l.status === "signed_both")
      .forEach((l) => generateMoisDisponibles(l.dateDebut).forEach((m) => years.add(m.split("-")[0])));
    return Array.from(years).sort().reverse();
  }

  async function sauvegarderLoyerRow(
    bailId: number, mois: string,
    loyerHC: number, chargesMois: number,
    statut: string, datePaiement: string, note: string
  ) {
    const montant = loyerHC + chargesMois;
    const existing = paiements.find((p) => p.bailId === bailId && p.mois === mois);
    const bail = locataires.find((l) => l.id === bailId);
    const payload = { loyerHC, chargesMois, montant, statut, datePaiement: datePaiement || null, note: note || null };
    if (existing) {
      const res = await fetch(`/api/paiements/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setPaiements((prev) => prev.map((p) => p.id === existing.id ? { ...p, ...updated } : p));
    } else if (bail) {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId, mois, ...payload }),
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
    setEditingLoyerRow(null);
  }

  async function sauvegarderDepotRow(bailId: number, montantRecu: number, datePaiement: string) {
    const existing = paiements.find((p) => p.bailId === bailId && p.mois === "caution");
    const bail = locataires.find((l) => l.id === bailId);
    const statut = montantRecu > 0 ? "paye" : "attendu";
    const payload = { montant: montantRecu, statut, datePaiement: datePaiement || null, note: "Dépôt de garantie" };
    if (existing) {
      const res = await fetch(`/api/paiements/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setPaiements((prev) => prev.map((p) => p.id === existing.id ? { ...p, ...updated } : p));
    } else if (bail && montantRecu > 0) {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId, mois: "caution", ...payload }),
      });
      const created = await res.json();
      setPaiements((prev) => [...prev, {
        ...created,
        bail: { id: bail.id, prenomNom: bail.prenomNom, mailLocataire: bail.mailLocataire, dateDebut: bail.dateDebut, appartement: { id: bail.appartement.id, titre: bail.appartement.titre, loyer: bail.appartement.loyer, montantCharges: bail.appartement.montantCharges } },
      }]);
    }
    setEditingDepotRow(null);
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
                { id: "baux",        label: "Baux",             icon: "📝" },
                { id: "inventaires", label: "États de lieux",   icon: "🗂️" },
                { id: "quittances",  label: "Quittances",       icon: "🧾" },
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
                        {/* Corps principal — cliquable */}
                        <Link href={`/admin/locataires/${loc.id}`} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 rounded-t-xl transition-colors block">
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

                        </Link>

                        {/* Pied de carte : actions discrètes */}
                        <div className="px-4 pb-3 flex items-center gap-4">
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
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setPaiementSubTab("loyer")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${paiementSubTab === "loyer" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Loyer
              </button>
              <button
                onClick={() => setPaiementSubTab("depot")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${paiementSubTab === "depot" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Dépôt de garantie
              </button>
            </div>

            {paiementsLoading || locatairesLoading ? (
              <div className="text-center py-8 text-gray-400">Chargement…</div>
            ) : paiementSubTab === "loyer" ? (
              <>
                {/* Filtres */}
                <div className="flex items-center gap-4 flex-wrap">
                  <select
                    value={filtreLocataire}
                    onChange={(e) => setFiltreLocataire(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les locataires</option>
                    {locataires.filter((l) => !l.archived && l.status === "signed_both").map((l) => (
                      <option key={l.id} value={String(l.id)}>{l.prenomNom ?? `Bail #${l.id}`}</option>
                    ))}
                  </select>
                  <select
                    value={filtreAnnee}
                    onChange={(e) => setFiltreAnnee(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toutes les années</option>
                    {getAnneesDisponibles().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-400">
                    {locataires.filter((l) => !l.archived && l.status === "signed_both").length} locataire(s) actif(s)
                  </span>
                  {/* Bouton vérification Gmail */}
                  <button
                    onClick={async () => {
                      setGmailChecking(true);
                      setGmailError(null);
                      setGmailResult(null);
                      setGmailSelected(new Set());
                      setGmailSaved(false);
                      try {
                        const res = await fetch("/api/paiements/check-gmail");
                        const data = await res.json();
                        if (!res.ok) { setGmailError(data.error ?? "Erreur"); return; }
                        setGmailResult(data);
                        // Pré-sélectionner tous les "confirmed"
                        const keys = new Set<string>(
                          data.confirmed.map((m: GmailMatch) => `${m.bailId}-${m.mois}`)
                        );
                        setGmailSelected(keys);
                        // Construire la map pour retrouver les matches lors de la validation
                        const map = new Map<string, GmailMatch>();
                        [...data.confirmed, ...data.ambiguous].forEach((m: GmailMatch) => {
                          map.set(`${m.bailId}-${m.mois}`, m);
                        });
                        setGmailMatchMap(map);
                      } catch { setGmailError("Erreur réseau"); }
                      finally { setGmailChecking(false); }
                    }}
                    disabled={gmailChecking}
                    className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {gmailChecking ? (
                      <><span className="animate-spin">⟳</span> Vérification…</>
                    ) : (
                      <>📬 Vérifier les règlements</>
                    )}
                  </button>
                </div>

                {/* Panneau résultats Gmail */}
                {(gmailResult || gmailError) && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Résultats Sumeria — Compte 4 rue Flamen</h3>
                      <button
                        onClick={() => { setGmailResult(null); setGmailError(null); setGmailSaved(false); }}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                      >×</button>
                    </div>

                    {gmailError && (
                      <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{gmailError}</p>
                    )}

                    {gmailResult && (
                      <>
                        {/* Confirmés */}
                        {gmailResult.confirmed.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-green-700 mb-2">
                              ✅ Règlements identifiés avec certitude ({gmailResult.confirmed.length})
                            </p>
                            <div className="space-y-2">
                              {gmailResult.confirmed.map((m, i) => (
                                <label key={i} className="flex items-start gap-3 p-3 rounded-lg border border-green-200 bg-green-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={gmailSelected.has(`${m.bailId}-${m.mois}`)}
                                    onChange={(e) => {
                                      const key = `${m.bailId}-${m.mois}`;
                                      setGmailSelected((prev) => {
                                        const s = new Set(prev);
                                        if (e.target.checked) s.add(key);
                                        else s.delete(key);
                                        return s;
                                      });
                                    }}
                                    className="mt-0.5 accent-green-600"
                                  />
                                  <div className="flex-1 text-sm">
                                    <div className="font-medium text-gray-900">{m.locataire} — {m.emailAmount.toLocaleString("fr-FR")} €</div>
                                    <div className="text-gray-500">
                                      Mois : {m.mois} · Reçu le {new Date(m.emailDate).toLocaleDateString("fr-FR")}
                                      {m.emailLibelle && <> · <span className="italic">{m.emailLibelle}</span></>}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ambigus */}
                        {gmailResult.ambiguous.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-amber-700 mb-2">
                              ⚠️ À vérifier ({gmailResult.ambiguous.length})
                            </p>
                            <div className="space-y-2">
                              {gmailResult.ambiguous.map((m, i) => (
                                <label key={i} className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={gmailSelected.has(`${m.bailId}-${m.mois}`)}
                                    onChange={(e) => {
                                      const key = `${m.bailId}-${m.mois}`;
                                      setGmailSelected((prev) => {
                                        const s = new Set(prev);
                                        if (e.target.checked) s.add(key);
                                        else s.delete(key);
                                        return s;
                                      });
                                    }}
                                    className="mt-0.5 accent-amber-600"
                                  />
                                  <div className="flex-1 text-sm">
                                    <div className="font-medium text-gray-900">{m.locataire} — {m.emailAmount.toLocaleString("fr-FR")} €</div>
                                    <div className="text-gray-500">
                                      Mois attendu : {m.mois} · Reçu le {new Date(m.emailDate).toLocaleDateString("fr-FR")}
                                      {m.emailLibelle && <> · <span className="italic">{m.emailLibelle}</span></>}
                                    </div>
                                    {m.reason && <div className="text-amber-600 text-xs mt-0.5">⚠ {m.reason}</div>}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sans correspondance */}
                        {gmailResult.noMatch.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">
                              ℹ️ Virements sans correspondance ({gmailResult.noMatch.length})
                            </p>
                            <div className="space-y-1">
                              {gmailResult.noMatch.map((m, i) => (
                                <div key={i} className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
                                  {m.emailSender} — {m.emailAmount.toLocaleString("fr-FR")} € · {new Date(m.emailDate).toLocaleDateString("fr-FR")}
                                  {m.reason && <span className="text-gray-400"> ({m.reason})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {gmailResult.confirmed.length === 0 && gmailResult.ambiguous.length === 0 && (
                          <p className="text-sm text-gray-500 py-2">
                            Aucun virement loyer trouvé sur le Compte 4 rue Flamen dans les 60 derniers jours.
                          </p>
                        )}

                        {/* Actions */}
                        {gmailSelected.size > 0 && (
                          <div className="flex items-center gap-3 pt-3 border-t border-gray-100 mt-2">
                            {gmailSaved ? (
                              <span className="text-sm text-green-600 font-medium">✅ {gmailSelected.size} paiement(s) marqué(s) comme payé</span>
                            ) : (
                              <>
                                <button
                                  onClick={async () => {
                                    setGmailSaving(true);
                                    const today = new Date().toISOString().slice(0, 10);
                                    const matches = Array.from(gmailSelected).map((key) => {
                                      const m = gmailMatchMap.get(key)!;
                                      return {
                                        bailId: m.bailId,
                                        mois: m.mois,
                                        existingPaiementId: m.existingPaiementId,
                                        montant: m.expectedMontant,
                                        datePaiement: today,
                                      };
                                    });
                                    const res = await fetch("/api/paiements/check-gmail", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ matches }),
                                    });
                                    setGmailSaving(false);
                                    if (res.ok) {
                                      setGmailSaved(true);
                                      // Mettre à jour la liste locale des paiements existants
                                      setPaiements((prev) =>
                                        prev.map((p) => {
                                          const key = `${p.bailId}-${p.mois}`;
                                          return gmailSelected.has(key)
                                            ? { ...p, statut: "paye", datePaiement: today }
                                            : p;
                                        })
                                      );
                                    }
                                  }}
                                  disabled={gmailSaving}
                                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  {gmailSaving ? "Enregistrement…" : `✓ Marquer ${gmailSelected.size} paiement(s) comme payé`}
                                </button>
                                <button
                                  onClick={() => setGmailSelected(new Set())}
                                  className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                  Tout décocher
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Tableau loyer */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Mois</th>
                        <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Locataire</th>
                        <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Logement</th>
                        <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Adresse</th>
                        <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Loyer HC</th>
                        <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Charges</th>
                        <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Total</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Statut</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Date paiement</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {locataires
                        .filter((l) => !l.archived && l.status === "signed_both")
                        .filter((l) => filtreLocataire === "all" || String(l.id) === filtreLocataire)
                        .flatMap((l) =>
                          generateMoisDisponibles(l.dateDebut)
                            .filter((mois) => filtreAnnee === "all" || mois.startsWith(filtreAnnee))
                            .map((mois) => {
                              const p = paiements.find((p) => p.bailId === l.id && p.mois === mois);
                              const loyerAppart = l.appartement.loyer ?? 0;
                              const chargesAppart = l.appartement.montantCharges ?? 0;
                              const proration = !p ? calculerProrata(l.dateDebut, loyerAppart, chargesAppart, mois) : null;
                              const loyerHC = p?.loyerHC ?? proration?.loyerHC ?? loyerAppart;
                              const charges = p?.chargesMois ?? proration?.charges ?? chargesAppart;
                              const estProrata = !p && (proration?.estProrata ?? false);
                              const total = loyerHC + charges;
                              const statut = p?.statut ?? "attendu";
                              const isEditing = editingLoyerRow?.bailId === l.id && editingLoyerRow?.mois === mois;
                              const moisLabel = new Date(mois + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                              return { l, mois, moisLabel, p, loyerHC, charges, total, statut, isEditing, estProrata };
                            })
                        )
                        .sort((a, b) => b.mois.localeCompare(a.mois))
                        .map(({ l, mois, moisLabel, p, loyerHC, charges, total, statut, isEditing, estProrata }) =>
                          isEditing ? (
                            <tr key={`${l.id}-${mois}`} className="bg-blue-50">
                              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{moisLabel}</td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">{l.prenomNom ?? "—"}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{l.appartement.titre}</td>
                              <td className="px-3 py-2 text-xs text-gray-500">{l.appartement.adresse}</td>
                              <td className="px-3 py-2">
                                <input type="number" step="0.01" value={editingLoyerRow!.loyerHC}
                                  onChange={(e) => setEditingLoyerRow((r) => r ? { ...r, loyerHC: e.target.value } : r)}
                                  className="w-20 border border-blue-300 rounded px-1.5 py-0.5 text-sm text-right" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" step="0.01" value={editingLoyerRow!.chargesMois}
                                  onChange={(e) => setEditingLoyerRow((r) => r ? { ...r, chargesMois: e.target.value } : r)}
                                  className="w-20 border border-blue-300 rounded px-1.5 py-0.5 text-sm text-right" />
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                                {(parseFloat(editingLoyerRow!.loyerHC || "0") + parseFloat(editingLoyerRow!.chargesMois || "0")).toFixed(2)} €
                              </td>
                              <td className="px-3 py-2">
                                <select value={editingLoyerRow!.statut}
                                  onChange={(e) => setEditingLoyerRow((r) => r ? { ...r, statut: e.target.value } : r)}
                                  className="border border-blue-300 rounded px-1.5 py-0.5 text-xs">
                                  <option value="attendu">En attente</option>
                                  <option value="paye">Payé</option>
                                  <option value="retard">Retard</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input type="date" value={editingLoyerRow!.datePaiement}
                                  onChange={(e) => setEditingLoyerRow((r) => r ? { ...r, datePaiement: e.target.value } : r)}
                                  className="border border-blue-300 rounded px-1.5 py-0.5 text-xs" />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => sauvegarderLoyerRow(l.id, mois, parseFloat(editingLoyerRow!.loyerHC) || 0, parseFloat(editingLoyerRow!.chargesMois) || 0, editingLoyerRow!.statut, editingLoyerRow!.datePaiement, editingLoyerRow!.note)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">✓</button>
                                  <button onClick={() => setEditingLoyerRow(null)}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300">✕</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={`${l.id}-${mois}`} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{moisLabel}</td>
                              <td className="px-3 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap">{l.prenomNom ?? "—"}</td>
                              <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{l.appartement.titre}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-500">{l.appartement.adresse}</td>
                              <td className="px-3 py-2.5 text-right text-sm text-gray-700">
                                {loyerHC > 0 ? `${loyerHC.toFixed(2)} €` : "—"}
                                {estProrata && <div className="text-xs text-blue-500">prorata</div>}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm text-gray-700">
                                {charges > 0 ? `${charges.toFixed(2)} €` : "—"}
                                {estProrata && <div className="text-xs text-blue-500">prorata</div>}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-900">{total > 0 ? `${total.toFixed(2)} €` : "—"}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statut === "paye" ? "bg-green-100 text-green-700" : statut === "retard" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                  {statut === "paye" ? "✓ Payé" : statut === "retard" ? "⚠ Retard" : "En attente"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs text-gray-500">
                                {p?.datePaiement ? new Date(p.datePaiement).toLocaleDateString("fr-FR") : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  onClick={() => setEditingLoyerRow({ bailId: l.id, mois, loyerHC: loyerHC.toFixed(2), chargesMois: charges.toFixed(2), statut, datePaiement: p?.datePaiement ?? "", note: p?.note ?? "" })}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
                                >✎</button>
                              </td>
                            </tr>
                          )
                        )}
                      {locataires.filter((l) => !l.archived && l.status === "signed_both").length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Aucun locataire actif</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Alertes retards */}
                {paiements.filter((p) => p.statut === "retard" && p.mois !== "caution").length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-medium text-red-800 mb-2">⚠ Retards</h3>
                    <ul className="space-y-1">
                      {paiements.filter((p) => p.statut === "retard" && p.mois !== "caution").map((p) => (
                        <li key={p.id} className="text-sm text-red-700">{p.bail.prenomNom} — {p.mois} — {p.montant.toFixed(0)} €</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              /* ── Dépôt de garantie ── */
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Locataire</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Logement</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Montant attendu</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Montant reçu</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Date réception</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {locataires
                      .filter((l) => !l.archived && l.status === "signed_both")
                      .map((l) => {
                        const pc = paiements.find((p) => p.bailId === l.id && p.mois === "caution");
                        const depot = l.appartement.loyer ?? 0;
                        const montantRecu = pc?.montant ?? 0;
                        const statut = pc?.statut ?? "attendu";
                        const isEditing = editingDepotRow?.bailId === l.id;
                        if (isEditing) {
                          return (
                            <tr key={l.id} className="bg-blue-50">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{l.prenomNom ?? "—"}</td>
                              <td className="px-4 py-2.5 text-gray-600">{l.appartement.titre}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{l.appartement.adresse}</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">{depot > 0 ? `${depot.toFixed(0)} €` : "—"}</td>
                              <td className="px-4 py-2.5">
                                <input type="number" step="0.01" value={editingDepotRow!.montantRecu}
                                  onChange={(e) => setEditingDepotRow((r) => r ? { ...r, montantRecu: e.target.value } : r)}
                                  className="w-24 border border-blue-300 rounded px-2 py-0.5 text-sm text-right" />
                                <span className="text-xs text-gray-500 ml-1">€</span>
                              </td>
                              <td className="px-4 py-2.5 text-center text-xs text-gray-400">—</td>
                              <td className="px-4 py-2.5">
                                <input type="date" value={editingDepotRow!.datePaiement}
                                  onChange={(e) => setEditingDepotRow((r) => r ? { ...r, datePaiement: e.target.value } : r)}
                                  className="border border-blue-300 rounded px-1.5 py-0.5 text-xs" />
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => sauvegarderDepotRow(l.id, parseFloat(editingDepotRow!.montantRecu) || 0, editingDepotRow!.datePaiement)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">✓</button>
                                  <button onClick={() => setEditingDepotRow(null)}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300">✕</button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={l.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{l.prenomNom ?? "—"}<div className="text-xs text-gray-400">{l.mailLocataire ?? l.emailInvitation}</div></td>
                            <td className="px-4 py-3 text-gray-600">{l.appartement.titre}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{l.appartement.adresse}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{depot > 0 ? `${depot.toFixed(0)} €` : "—"}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{montantRecu > 0 ? `${montantRecu.toFixed(0)} €` : "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statut === "paye" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {statut === "paye" ? "✓ Reçu" : "En attente"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                              {pc?.datePaiement ? new Date(pc.datePaiement).toLocaleDateString("fr-FR") : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setEditingDepotRow({ bailId: l.id, montantRecu: (montantRecu || depot).toFixed(0), datePaiement: pc?.datePaiement ?? "" })}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
                              >✎</button>
                            </td>
                          </tr>
                        );
                      })}
                    {locataires.filter((l) => !l.archived && l.status === "signed_both").length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun locataire actif</td></tr>
                    )}
                  </tbody>
                </table>
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

            {/* ─ Sous-onglet États des lieux ─ */}
            {activeSubTab === "inventaires" && (() => {
              const EDL_STATUS: Record<string, { label: string; color: string }> = {
                draft:          { label: "Brouillon",             color: "bg-gray-100 text-gray-500" },
                signed_bailleur:{ label: "En attente locataire",  color: "bg-blue-100 text-blue-700" },
                signed_both:    { label: "Signé ✓",              color: "bg-green-100 text-green-700" },
              };

              async function handleCreateEdl() {
                if (!newEdlInventaireId || !newEdlEmail) return;
                setNewEdlSaving(true);
                const res = await fetch("/api/etats-des-lieux", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    inventaireId: parseInt(newEdlInventaireId),
                    type: newEdlType,
                    locataireNom: newEdlNom || null,
                    locataireEmail: newEdlEmail,
                  }),
                });
                const edl = await res.json();
                setNewEdlSaving(false);
                setShowNewEdl(false);
                router.push(`/admin/edl/${edl.id}`);
              }

              return (
                <>
                  {/* En-tête */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">États des lieux</h2>
                    <button
                      onClick={() => {
                        setShowNewEdl(true);
                        setNewEdlType("entree");
                        setNewEdlInventaireId("");
                        setNewEdlNom("");
                        setNewEdlEmail("");
                        setNewEdlBauxAppart([]);
                      }}
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      + Nouvel état des lieux
                    </button>
                  </div>

                  {/* Formulaire inline */}
                  {showNewEdl && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Nouvel état des lieux</h3>
                        <button onClick={() => setShowNewEdl(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                      </div>

                      <div className="space-y-4">
                        {/* Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                          <div className="flex gap-2">
                            {(["entree", "sortie"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNewEdlType(t)}
                                className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                                  newEdlType === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"
                                }`}
                              >
                                {t === "entree" ? "🔑 Entrée" : "🚪 Sortie"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Appartement */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Appartement</label>
                          {inventairesLoading ? (
                            <p className="text-sm text-gray-400">Chargement…</p>
                          ) : (
                            <select
                              value={newEdlInventaireId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewEdlInventaireId(val);
                                setNewEdlNom("");
                                setNewEdlEmail("");
                                setNewEdlBauxAppart([]);
                                if (val) {
                                  const inv = inventaires.find((i) => i.id === parseInt(val));
                                  if (inv) {
                                    fetch(`/api/baux?appartementId=${inv.appartementId}`)
                                      .then((r) => r.json())
                                      .then((data: BailListItem[]) => {
                                        const actifs = Array.isArray(data) ? data.filter((b) => b.prenomNom) : [];
                                        setNewEdlBauxAppart(actifs);
                                        if (actifs.length === 1) {
                                          setNewEdlNom(actifs[0].prenomNom ?? "");
                                          setNewEdlEmail(actifs[0].mailLocataire ?? "");
                                        }
                                      });
                                  }
                                }
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                              <option value="">— Choisir un appartement —</option>
                              {inventaires.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.appartement.titre}
                                  {inv.appartement.adresse ? ` — ${inv.appartement.adresse}` : ""}
                                  {inv.appartement.etage !== null ? ` (${inv.appartement.etage === 0 ? "RDC" : `${inv.appartement.etage}e`})` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Locataire */}
                        {newEdlInventaireId && (
                          <div className="space-y-3">
                            {newEdlBauxAppart.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Locataire (bail existant)</label>
                                <select
                                  value={newEdlNom ? `${newEdlNom}|${newEdlEmail}` : ""}
                                  onChange={(e) => {
                                    if (!e.target.value) { setNewEdlNom(""); setNewEdlEmail(""); return; }
                                    const [nom, email] = e.target.value.split("|");
                                    setNewEdlNom(nom);
                                    setNewEdlEmail(email);
                                  }}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                >
                                  <option value="">— Sélectionner —</option>
                                  {newEdlBauxAppart.map((b) => (
                                    <option key={b.id} value={`${b.prenomNom}|${b.mailLocataire ?? ""}`}>
                                      {b.prenomNom}{b.mailLocataire ? ` (${b.mailLocataire})` : ""}
                                    </option>
                                  ))}
                                  <option value="nouveau|">Nouveau locataire…</option>
                                </select>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du locataire</label>
                                <input
                                  type="text"
                                  value={newEdlNom === "nouveau" ? "" : newEdlNom}
                                  onChange={(e) => setNewEdlNom(e.target.value)}
                                  placeholder="Prénom Nom"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                                <input
                                  type="email"
                                  value={newEdlEmail === "nouveau" ? "" : newEdlEmail}
                                  onChange={(e) => setNewEdlEmail(e.target.value)}
                                  placeholder="locataire@exemple.fr"
                                  required
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleCreateEdl}
                            disabled={!newEdlInventaireId || !newEdlEmail || newEdlSaving}
                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {newEdlSaving ? "Création…" : "Créer l'état des lieux →"}
                          </button>
                          <button onClick={() => setShowNewEdl(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300">
                            Annuler
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Liste des EDL */}
                  {edlsLoading ? (
                    <div className="text-center py-20 text-gray-400">Chargement…</div>
                  ) : edls.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <p className="text-4xl mb-3">🗂️</p>
                      <p>Aucun état des lieux. Créez-en un avec le bouton ci-dessus.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {edls.map((edl) => {
                        const st = EDL_STATUS[edl.status] ?? { label: edl.status, color: "bg-gray-100 text-gray-600" };
                        const appart = edl.inventaire.appartement;
                        return (
                          <Link
                            key={edl.id}
                            href={`/admin/edl/${edl.id}`}
                            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-400 hover:shadow-sm transition-all group"
                          >
                            <span className="text-xl flex-shrink-0">{edl.type === "entree" ? "🔑" : "🚪"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 truncate">
                                  {edl.locataireNom ?? <span className="italic text-gray-400 font-normal">Locataire non renseigné</span>}
                                </span>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-sm text-gray-500">{edl.type === "entree" ? "Entrée" : "Sortie"}</span>
                              </div>
                              <p className="text-sm text-gray-400 mt-0.5 truncate">
                                {appart.titre}
                                {appart.adresse ? ` — ${appart.adresse}` : ""}
                                {appart.etage !== null ? ` (${appart.etage === 0 ? "RDC" : `${appart.etage}e`})` : ""}
                                {edl.date ? ` · ${edl.date}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                              <span className="text-gray-300 group-hover:text-gray-600 transition-colors">→</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
            {/* ─ Sous-onglet Quittances ─ */}
            {activeSubTab === "quittances" && (() => {
              // Baux avec un locataire identifié (prenomNom renseigné)
              const bauxAvecLocataire = baux.filter((b) => b.prenomNom);
              const selectedBail = bauxAvecLocataire.find((b) => b.id === parseInt(qBailId));
              const quittanceUrl = selectedBail && qMois
                ? `/quittance/${selectedBail.token}?moisDebut=${qMois}${qModeRange && qMoisFin ? `&moisFin=${qMoisFin}` : ""}`
                : null;

              async function handleSendEmail() {
                if (!selectedBail || !qMois) return;
                setQSending(true);
                setQSent(false);
                setQError(null);
                try {
                  const res = await fetch("/api/quittances/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      bailId: selectedBail.id,
                      moisDebut: qMois,
                      moisFin: qModeRange && qMoisFin ? qMoisFin : qMois,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    setQError(err.error ?? "Erreur lors de l'envoi");
                  } else {
                    setQSent(true);
                  }
                } catch {
                  setQError("Erreur réseau");
                } finally {
                  setQSending(false);
                }
              }

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Quittances de loyer</h2>
                      <p className="text-sm text-gray-400 mt-1">Générez et envoyez une quittance au locataire.</p>
                    </div>
                  </div>

                  {bauxLoading ? (
                    <div className="text-center py-20 text-gray-400">Chargement…</div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
                      {/* Sélection locataire */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Locataire</label>
                        <select
                          value={qBailId}
                          onChange={(e) => { setQBailId(e.target.value); setQSent(false); setQError(null); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                          <option value="">— Choisir un locataire —</option>
                          {bauxAvecLocataire.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.prenomNom} — {b.appartement.titre}
                              {b.appartement.ville ? ` (${b.appartement.ville})` : ""}
                            </option>
                          ))}
                        </select>
                        {selectedBail && (selectedBail.mailLocataire == null) && (
                          <p className="text-xs text-amber-600 mt-1">⚠️ Ce locataire n&apos;a pas d&apos;adresse email enregistrée.</p>
                        )}
                      </div>

                      {/* Mode : mois unique ou période */}
                      <div className="mb-4 flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                          <input
                            type="radio"
                            checked={!qModeRange}
                            onChange={() => setQModeRange(false)}
                            className="accent-gray-900"
                          />
                          Mois unique
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                          <input
                            type="radio"
                            checked={qModeRange}
                            onChange={() => setQModeRange(true)}
                            className="accent-gray-900"
                          />
                          Période (plusieurs mois)
                        </label>
                      </div>

                      {/* Sélection mois */}
                      {!qModeRange ? (
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mois</label>
                          <input
                            type="month"
                            value={qMois}
                            onChange={(e) => { setQMois(e.target.value); setQSent(false); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                          />
                        </div>
                      ) : (
                        <div className="mb-5 flex gap-4 flex-wrap">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">De</label>
                            <input
                              type="month"
                              value={qMois}
                              onChange={(e) => { setQMois(e.target.value); setQSent(false); }}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">À</label>
                            <input
                              type="month"
                              value={qMoisFin}
                              min={qMois}
                              onChange={(e) => { setQMoisFin(e.target.value); setQSent(false); }}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 flex-wrap">
                        <a
                          href={quittanceUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={!quittanceUrl ? (e) => e.preventDefault() : undefined}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            quittanceUrl
                              ? "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200"
                              : "bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100"
                          }`}
                        >
                          🖨️ Télécharger / Imprimer
                        </a>
                        <button
                          disabled={!selectedBail || !qMois || qSending || !selectedBail.mailLocataire}
                          onClick={handleSendEmail}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {qSending ? "Envoi…" : "📧 Envoyer par email"}
                        </button>
                      </div>

                      {qSent && (
                        <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                          ✅ Email envoyé à {selectedBail?.mailLocataire}
                        </p>
                      )}
                      {qError && (
                        <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                          ⚠️ {qError}
                        </p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
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
