"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { isValidEmail } from "@/lib/validators";

type Appartement = { id: number; titre: string; loyer: number; montantCharges: number | null; etage: number | null; nbPieces: number };

/* ── Rappel encadrement des loyers ──────────────────────────────────────── */
function RappelEncadrement({ anneeArrete, fetchedAt }: { anneeArrete: number | null; fetchedAt: string | null }) {
  const now = new Date();
  // L'arrêté en vigueur : avril N → mars N+1
  // Si on est en avril ou plus → arrêté de l'année en cours, sinon de l'année précédente
  const anneeEnVigueur = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const estPerime = anneeArrete !== null && anneeArrete < anneeEnVigueur;
  const sourcePerimee = anneeArrete !== null && anneeArrete < 2025; // data.gouv.fr pas mis à jour

  if (!fetchedAt && anneeArrete === null) {
    // Avant toute récupération : bandeau informatif neutre
    return (
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-800">
        <span className="text-base leading-none mt-px">ℹ️</span>
        <div className="space-y-0.5">
          <p className="font-medium">Cliquez sur « Récupérer automatiquement » pour pré-remplir les valeurs.</p>
          <p className="text-blue-600">
            Les données proviennent du dataset data.gouv.fr (dernière version disponible).
            L&apos;arrêté préfectoral est renouvelé chaque <strong>1er avril</strong> — pensez à vérifier les valeurs à cette date.
          </p>
        </div>
      </div>
    );
  }

  if (sourcePerimee || estPerime) {
    return (
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 text-xs text-amber-900">
        <span className="text-base leading-none mt-px">⚠️</span>
        <div className="space-y-0.5">
          <p className="font-medium">
            Valeurs issues de l&apos;arrêté {anneeArrete} — un nouvel arrêté est en vigueur depuis le 1er avril {anneeEnVigueur}.
          </p>
          <p className="text-amber-700">
            Le dataset data.gouv.fr n&apos;a pas encore été mis à jour. Vérifiez et corrigez manuellement les valeurs sur{" "}
            <a
              href="https://ssilab-ddtm-encadrement-loyers-33.webself.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900 font-medium"
            >
              le site de la préfecture du Nord
            </a>.
          </p>
          {fetchedAt && <p className="text-amber-600">Dernière récupération : {fetchedAt}</p>}
        </div>
      </div>
    );
  }

  // Tout est à jour
  return (
    <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-xs text-green-800">
      <span className="text-base leading-none mt-px">✅</span>
      <div className="space-y-0.5">
        <p className="font-medium">Valeurs de l&apos;arrêté {anneeArrete} ({anneeArrete}/{anneeArrete ? anneeArrete + 1 : "?"}) — récupérées le {fetchedAt}.</p>
        <p className="text-green-600">
          Prochain renouvellement le <strong>1er avril {anneeEnVigueur + 1}</strong> — pensez à cliquer sur « Récupérer automatiquement » à cette date.
        </p>
      </div>
    </div>
  );
}

function NewBailForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appartementIdParam = searchParams.get("appart");

  const [appartements, setAppartements] = useState<Appartement[]>([]);
  const [appartementId, setAppartementId] = useState(appartementIdParam ?? "");
  const [emailInvitation, setEmailInvitation] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [irlTrimestre, setIrlTrimestre] = useState("");
  const [irlValeur, setIrlValeur] = useState("");
  const [loyerReference, setLoyerReference] = useState("19.50");
  const [loyerReferenceMaj, setLoyerReferenceMaj] = useState("23.40");
  const [irlLoading, setIrlLoading] = useState(false);
  const [encLoading, setEncLoading] = useState(false);
  const [encAnnee, setEncAnnee] = useState<number | null>(null);
  const [encFetchedAt, setEncFetchedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tenantUrl, setTenantUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  // Charger les dernières valeurs d'encadrement depuis localStorage
  useEffect(() => {
    const savedRef = localStorage.getItem("encadrement_loyerReference");
    const savedMaj = localStorage.getItem("encadrement_loyerReferenceMaj");
    if (savedRef) setLoyerReference(savedRef);
    if (savedMaj) setLoyerReferenceMaj(savedMaj);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/appartements")
        .then((r) => r.json())
        .then(setAppartements);
    }
  }, [status]);

  async function fetchIRL() {
    setIrlLoading(true);
    try {
      const res = await fetch("/api/irl");
      const data = await res.json();
      if (data.trimestre) {
        setIrlTrimestre(data.trimestre);
        setIrlValeur(data.valeur);
      } else {
        setError("IRL indisponible — veuillez saisir manuellement.");
      }
    } catch {
      setError("Erreur réseau pour l'IRL.");
    }
    setIrlLoading(false);
  }

  async function fetchEncadrement() {
    const appart = appartements.find((a) => String(a.id) === appartementId);
    if (!appart) { setError("Sélectionnez d'abord un appartement."); return; }
    setEncLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/encadrement?nbPieces=${appart.nbPieces}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setLoyerReference(data.reference);
      setLoyerReferenceMaj(data.majore);
      setEncAnnee(data.anneeArrete);
      setEncFetchedAt(new Date().toLocaleDateString("fr-FR"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encadrement indisponible.");
    }
    setEncLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appartementId || !dateDebut) { setError("Appartement et date de début sont requis."); return; }
    if (emailInvitation && !isValidEmail(emailInvitation)) {
      setError("Format d'email invalide."); return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/baux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appartementId, emailInvitation, dateDebut, irlTrimestre, irlValeur, loyerReference, loyerReferenceMaj }),
      });
      const bail = await res.json();
      if (!res.ok) throw new Error(bail.error ?? "Erreur serveur");
      // Persister les valeurs d'encadrement comme nouvelles valeurs par défaut
      localStorage.setItem("encadrement_loyerReference", loyerReference);
      localStorage.setItem("encadrement_loyerReferenceMaj", loyerReferenceMaj);
      const url = `${window.location.origin}/bail/${bail.token}`;
      setTenantUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  function copyLink() {
    if (!tenantUrl) return;
    navigator.clipboard.writeText(tenantUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openGmail() {
    if (!tenantUrl) return;
    const appart = appartements.find((a) => String(a.id) === appartementId);
    const titreAppart = appart?.titre ?? "votre logement";
    const subject = encodeURIComponent(`Contrat de location — ${titreAppart}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nSuite à notre échange, veuillez cliquer sur le lien ci-dessous pour renseigner vos informations et signer électroniquement votre contrat de location :\n\n${tenantUrl}\n\nCe formulaire vous permettra :\n- De renseigner vos coordonnées et celles de votre garant\n- De lire l'intégralité du contrat de location\n- De le signer électroniquement\n\nN'hésitez pas à me contacter pour toute question.\n\nCordialement,\nGautier Lictevout\n06 83 97 48 72`
    );
    const to = encodeURIComponent(emailInvitation);
    const gmailUrl = `https://mail.google.com/mail/?view=cm${emailInvitation ? `&to=${to}` : ""}&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  }

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;

  /* ── ÉCRAN DE SUCCÈS ── */
  if (tenantUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">← Retour</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-sm font-medium text-gray-700">Bail créé ✓</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">

          {/* URL */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Lien à envoyer au locataire</h2>
            <p className="text-sm text-gray-500">
              Ce lien unique permet au locataire de lire le contrat et de le signer électroniquement.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-sm text-gray-700 break-all select-all">
              {tenantUrl}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={copyLink}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {copied ? "✓ Copié !" : "📋 Copier le lien"}
              </button>
              <button
                onClick={openGmail}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {/* Google "M" icon */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Préparer l&apos;email dans Gmail
              </button>
            </div>
            {emailInvitation && (
              <p className="text-xs text-gray-400">
                Email pré-rempli pour&nbsp;: <strong>{emailInvitation}</strong>
              </p>
            )}
          </div>

          <p className="text-xs text-center text-gray-400">
            Gmail s&apos;ouvrira dans un nouvel onglet avec le message pré-rédigé. Vous pourrez le vérifier avant d&apos;envoyer.
          </p>
        </main>
      </div>
    );
  }

  /* ── FORMULAIRE DE CRÉATION ── */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">← Retour</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-700">Nouveau bail</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Appartement */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Appartement</h2>
            <div>
              <label className="label">Appartement *</label>
              <select value={appartementId} onChange={(e) => setAppartementId(e.target.value)} required className="input">
                <option value="">— Sélectionner —</option>
                {appartements.map((a) => (
                  <option key={a.id} value={a.id}>{a.titre} — {a.loyer.toLocaleString("fr-FR")} €/mois HC</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Email du locataire</label>
              <input
                type="email"
                value={emailInvitation}
                onChange={(e) => setEmailInvitation(e.target.value)}
                className={`input ${emailInvitation && !isValidEmail(emailInvitation) ? "border-red-400 focus:ring-red-400" : ""}`}
                placeholder="locataire@email.fr"
              />
              {emailInvitation && !isValidEmail(emailInvitation) && (
                <p className="text-xs text-red-500 mt-1">Format d'email invalide</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Utilisé pour pré-remplir l'email Gmail après création.</p>
            </div>
          </section>

          {/* Date de début */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Date de prise d&apos;effet</h2>
            <div>
              <label className="label">Date de début du bail *</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required className="input" />
            </div>
          </section>

          {/* IRL */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-gray-900">Indice de Référence des Loyers (IRL)</h2>
              <button type="button" onClick={fetchIRL} disabled={irlLoading}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                {irlLoading ? "Récupération…" : "Récupérer automatiquement"}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Trimestre de référence</label>
                <input type="text" value={irlTrimestre} onChange={(e) => setIrlTrimestre(e.target.value)} placeholder="Ex. T1 2025" className="input" />
              </div>
              <div>
                <label className="label">Valeur de l&apos;indice</label>
                <input type="text" value={irlValeur} onChange={(e) => setIrlValeur(e.target.value)} placeholder="Ex. 144.62" className="input" />
              </div>
            </div>
          </section>

          {/* Encadrement loyers */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">Encadrement des loyers (Lille)</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Zone 3 · Avant 1946 · Meublé — valeurs selon le nombre de pièces de l&apos;appartement
                </p>
              </div>
              <button
                type="button"
                onClick={fetchEncadrement}
                disabled={encLoading || !appartementId}
                title={!appartementId ? "Sélectionnez d'abord un appartement" : ""}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {encLoading ? "Récupération…" : "Récupérer automatiquement"}
              </button>
            </div>

            {/* Rappel annuel */}
            <RappelEncadrement anneeArrete={encAnnee} fetchedAt={encFetchedAt} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Loyer de référence (€/m²)</label>
                <input
                  type="text"
                  value={loyerReference}
                  onChange={(e) => setLoyerReference(e.target.value)}
                  className="input"
                  placeholder="19.50"
                />
              </div>
              <div>
                <label className="label">Loyer de référence majoré (€/m²)</label>
                <input
                  type="text"
                  value={loyerReferenceMaj}
                  onChange={(e) => setLoyerReferenceMaj(e.target.value)}
                  className="input"
                  placeholder="23.40"
                />
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full sm:w-auto bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? "Création…" : "Envoyer le mail au locataire"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewBailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>}>
      <NewBailForm />
    </Suspense>
  );
}
