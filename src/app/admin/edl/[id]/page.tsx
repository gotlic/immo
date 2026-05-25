"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SignatureCanvas from "@/components/SignatureCanvas";

type Ligne = {
  id: string; objet: string;
  nbEntree: string; etatEntree: string;
  nbSortie: string; etatSortie: string;
};

/* ── Composants UI partagés avec InventaireEditor ── */
const ETAT_OPTIONS = ["Neuf", "Très bon", "Bon", "Correct", "A remplacer", "Antiquité"] as const;
const ETAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Neuf":        { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300"  },
  "Très bon":    { bg: "bg-teal-100",   text: "text-teal-800",   border: "border-teal-300"   },
  "Bon":         { bg: "bg-lime-100",   text: "text-lime-800",   border: "border-lime-300"   },
  "Correct":     { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  "A remplacer": { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-300"    },
  "Antiquité":   { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300"  },
};

function EtatSelect({ value, onChange, placeholder = "—" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const isPredefined = (ETAT_OPTIONS as readonly string[]).includes(value);
  const [textMode, setTextMode] = useState(!isPredefined && value !== "");
  useEffect(() => {
    if (value === "" || (ETAT_OPTIONS as readonly string[]).includes(value)) setTextMode(false);
  }, [value]);
  const c = isPredefined ? ETAT_COLORS[value] : null;
  const selectClass = c
    ? `${c.bg} ${c.text} ${c.border} border rounded px-2 py-1 text-sm font-medium w-full outline-none cursor-pointer`
    : "bg-white text-gray-600 border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none cursor-pointer";
  if (textMode) return (
    <div className="flex gap-1 items-center">
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-400 min-w-0" placeholder="Préciser…" />
      <button type="button" onClick={() => { setTextMode(false); onChange(""); }} className="text-gray-400 hover:text-gray-600 text-xs px-1" title="Retour">✕</button>
    </div>
  );
  return (
    <select value={value} onChange={(e) => { if (e.target.value === "__libre__") { setTextMode(true); onChange(""); } else onChange(e.target.value); }} className={selectClass}>
      <option value="">{placeholder}</option>
      {ETAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__libre__">Texte libre…</option>
    </select>
  );
}

function QteCell({ value, onChange, readOnly = false }: { value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  const nb = Math.max(1, parseInt(value) || 1);
  if (readOnly) return <span className="block w-6 text-center text-sm font-semibold tabular-nums select-none mx-auto">{nb}</span>;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="w-6 text-center text-sm font-semibold tabular-nums select-none">{nb}</span>
      <div className="flex flex-col gap-px">
        <button type="button" onClick={() => onChange?.(String(nb + 1))} className="w-5 h-[14px] flex items-center justify-center text-gray-400 hover:text-gray-800 transition-colors">
          <svg width="9" height="6" viewBox="0 0 9 6" fill="currentColor"><path d="M4.5 0L9 6H0z"/></svg>
        </button>
        <button type="button" onClick={() => onChange?.(String(Math.max(1, nb - 1)))} disabled={nb <= 1} className="w-5 h-[14px] flex items-center justify-center text-gray-400 hover:text-gray-800 disabled:opacity-25 transition-colors">
          <svg width="9" height="6" viewBox="0 0 9 6" fill="currentColor"><path d="M4.5 6L0 0H9z"/></svg>
        </button>
      </div>
    </div>
  );
}

function IconSortie() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
}

type Edl = {
  id: number; token: string; type: "entree" | "sortie"; date: string | null; status: string;
  lignes: string; photos: string;
  remarqueCuisine: string | null; remarqueSDB: string | null;
  remarquePiece: string | null; remarqueGeneral: string | null;
  locataireNom: string | null; locataireEmail: string | null;
  signatureBailleur: string | null; signatureBailleurAt: string | null;
  signatureLocataire: string | null; signatureLocataireAt: string | null;
  inventaire: { appartement: { titre: string; adresse: string | null; ville: string | null } };
};

export default function EdlAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [edl, setEdl] = useState<Edl | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [remarqueCuisine, setRemarqueCuisine] = useState("");
  const [remarqueSDB, setRemarqueSDB] = useState("");
  const [remarquePiece, setRemarquePiece] = useState("");
  const [remarqueGeneral, setRemarqueGeneral] = useState("");
  const [locataireNom, setLocataireNom] = useState("");
  const [locataireEmail, setLocataireEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/etats-des-lieux/${id}`, { method: "DELETE" });
    router.push("/admin");
  }
  const [showSignature, setShowSignature] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/etats-des-lieux/${id}`)
      .then((r) => r.json())
      .then((data: Edl) => {
        setEdl(data);
        setLignes(JSON.parse(data.lignes || "[]"));
        setPhotos(JSON.parse(data.photos || "[]"));
        setRemarqueCuisine(data.remarqueCuisine ?? "");
        setRemarqueSDB(data.remarqueSDB ?? "");
        setRemarquePiece(data.remarquePiece ?? "");
        setRemarqueGeneral(data.remarqueGeneral ?? "");
        setLocataireNom(data.locataireNom ?? "");
        setLocataireEmail(data.locataireEmail ?? "");
      });
  }, [id]);

  function updateLigne(idx: number, field: keyof Ligne, value: string) {
    setLignes((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function uploadPhoto(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    return data.url;
  }

  async function handlePhotoFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadPhoto(file);
      newUrls.push(url);
    }
    setPhotos((prev) => [...prev, ...newUrls]);
    setUploading(false);
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/etats-des-lieux/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lignes: JSON.stringify(lignes),
        photos: JSON.stringify(photos),
        remarqueCuisine: remarqueCuisine || null,
        remarqueSDB: remarqueSDB || null,
        remarquePiece: remarquePiece || null,
        remarqueGeneral: remarqueGeneral || null,
        locataireNom: locataireNom || null,
        locataireEmail: locataireEmail || null,
      }),
    });
    setSaving(false);
  }

  async function handleSignBailleur(signatureUrl: string) {
    setSigning(true);
    await handleSave();
    const res = await fetch(`/api/etats-des-lieux/${id}/sign-bailleur`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureUrl }),
    });
    const updated = await res.json();
    setEdl(updated);
    setShowSignature(false);
    setSigning(false);
  }

  async function handleNotify() {
    setNotifying(true);
    await fetch(`/api/etats-des-lieux/${id}/notify-tenant`, { method: "POST" });
    setNotified(true);
    setNotifying(false);
  }

  if (!edl) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;

  const isEntree = edl.type === "entree";
  const isSigned = edl.status !== "draft";
  const isBoth = edl.status === "signed_both";
  const appart = edl.inventaire.appartement;

  const STATUS = {
    draft: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
    signed_bailleur: { label: "Signé par le bailleur", color: "bg-blue-100 text-blue-700" },
    signed_both: { label: "Signé par les deux parties ✓", color: "bg-green-100 text-green-700" },
  };
  const st = STATUS[edl.status as keyof typeof STATUS] ?? STATUS.draft;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 font-medium">Back office</Link>
            <span className="text-gray-300">/</span>
            <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← Retour</button>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <div className="hidden sm:block">
              <h1 className="text-base font-semibold text-gray-900">
                État des lieux {isEntree ? "d'entrée 🔑" : "de sortie 🚪"}
              </h1>
              <p className="text-xs text-gray-400">{appart.titre} · {edl.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
            {confirmDelete ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-red-700">Supprimer cet EDL ?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 disabled:opacity-50">
                  {deleting ? "…" : "Oui"}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-1">Non</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
                🗑 Supprimer
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Infos locataire */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Locataire</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom</label>
              <input type="text" value={locataireNom} onChange={(e) => setLocataireNom(e.target.value)} className="input" placeholder="Prénom Nom" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={locataireEmail} onChange={(e) => setLocataireEmail(e.target.value)} className="input" placeholder="email@exemple.fr" />
            </div>
          </div>
        </section>

        {/* Tableau des lignes */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900">Inventaire</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEntree ? "Remplissez les colonnes Entrée." : "Utilisez la flèche → pour copier l'état d'entrée."}
              </p>
            </div>
            {!isEntree && (
              <button
                type="button"
                onClick={() => setLignes((prev) => prev.map((l) => ({ ...l, nbSortie: l.nbEntree, etatSortie: l.etatEntree })))}
                className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Tout copier <IconSortie />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[8%]" />
                <col className="w-[24%]" />
                {!isEntree && <>
                  <col className="w-[6%]" />
                  <col className="w-[8%]" />
                  <col className="w-[22%]" />
                  <col className="w-[4%]" />
                </>}
              </colgroup>
              <thead>
                <tr className="text-xs uppercase tracking-wide font-medium">
                  <th className="bg-gray-50 px-3 py-2.5 text-left text-gray-500" />
                  <th className="bg-blue-50 px-2 py-2.5 text-center text-blue-600">Qté</th>
                  <th className="bg-blue-50 px-2 py-2.5 text-left text-blue-600">État entrée</th>
                  {!isEntree && <>
                    <th className="bg-gray-50 px-1 py-2.5" />
                    <th className={`px-2 py-2.5 text-center ${lignes.some(l => l.nbSortie || l.etatSortie) ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-300"}`}>Qté</th>
                    <th className={`px-2 py-2.5 text-left ${lignes.some(l => l.nbSortie || l.etatSortie) ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-300"}`}>État sortie</th>
                    <th className="bg-gray-50 px-2 py-2.5" />
                  </>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.map((l, idx) => {
                  const hasSortie = !!(l.nbSortie || l.etatSortie);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50/50 align-middle">
                      <td className="px-3 py-1.5 text-gray-900 font-medium text-sm">{l.objet}</td>
                      <td className="bg-blue-50/30 px-2 py-1.5">
                        {isEntree
                          ? <QteCell value={l.nbEntree} onChange={(v) => updateLigne(idx, "nbEntree", v)} />
                          : <QteCell value={l.nbEntree} readOnly />}
                      </td>
                      <td className="bg-blue-50/30 px-2 py-1.5">
                        {isEntree
                          ? <EtatSelect value={l.etatEntree} onChange={(v) => updateLigne(idx, "etatEntree", v)} placeholder="— Entrée —" />
                          : (() => { const c = ETAT_COLORS[l.etatEntree]; return (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c ? `${c.bg} ${c.text} ${c.border} border` : "text-gray-500"}`}>
                                {l.etatEntree || "—"}
                              </span>); })()
                        }
                      </td>
                      {!isEntree && <>
                        <td className="px-1 py-1.5 text-center bg-gray-50/30">
                          <button
                            type="button"
                            onClick={() => { updateLigne(idx, "nbSortie", l.nbEntree); updateLigne(idx, "etatSortie", l.etatEntree); }}
                            title="Copier depuis l'entrée"
                            className={`mx-auto flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${hasSortie ? "text-orange-500 bg-orange-50 hover:bg-orange-100" : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"}`}
                          ><IconSortie /></button>
                        </td>
                        <td className={`px-2 py-1.5 ${hasSortie ? "bg-orange-50/30" : ""}`}>
                          {hasSortie
                            ? <QteCell value={l.nbSortie || "1"} onChange={(v) => updateLigne(idx, "nbSortie", v)} />
                            : <span className="block text-center text-gray-200 select-none">—</span>}
                        </td>
                        <td className={`px-2 py-1.5 ${hasSortie ? "bg-orange-50/30" : ""}`}>
                          {hasSortie ? (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 min-w-0">
                                <EtatSelect value={l.etatSortie} onChange={(v) => updateLigne(idx, "etatSortie", v)} placeholder="— Sortie —" />
                              </div>
                              <button type="button"
                                onClick={() => { updateLigne(idx, "nbSortie", ""); updateLigne(idx, "etatSortie", ""); }}
                                className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-orange-500 transition-colors rounded hover:bg-orange-50"
                              >✕</button>
                            </div>
                          ) : (
                            <span className="block text-gray-200 select-none text-sm">—</span>
                          )}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            onClick={() => setLignes((prev) => prev.filter((_, i) => i !== idx))}
                            className="mx-auto flex items-center justify-center w-7 h-7 rounded text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          ><IconTrash /></button>
                        </td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Remarques */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Remarques par pièce</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Cuisine", value: remarqueCuisine, set: setRemarqueCuisine },
              { label: "Salle de bain / WC", value: remarqueSDB, set: setRemarqueSDB },
              { label: "Pièce principale", value: remarquePiece, set: setRemarquePiece },
              { label: "Remarques générales", value: remarqueGeneral, set: setRemarqueGeneral },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="label">{label}</label>
                <textarea rows={2} value={value} onChange={(e) => set(e.target.value)} className="input resize-none" placeholder="RAS…" />
              </div>
            ))}
          </div>
        </section>

        {/* Photos */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Photos</h2>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100">
                  <Image src={url} alt="" fill sizes="160px" className="object-cover" unoptimized={url.startsWith("/uploads/")} />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Téléversement…
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {/* Caméra directe (mobile/tablette) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              📷 Prendre une photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />

            {/* Upload depuis fichier */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              📁 Depuis fichier
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />
          </div>
        </section>

        {/* Actions */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Signatures</h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? "Sauvegarde…" : "💾 Sauvegarder"}
            </button>

            {!edl.signatureBailleur && (
              <button
                onClick={() => setShowSignature(true)}
                disabled={signing}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                ✍️ Signer (bailleur)
              </button>
            )}

            {edl.signatureBailleur && !isBoth && locataireEmail && (
              <button
                onClick={handleNotify}
                disabled={notifying || notified}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {notified ? "✅ Email envoyé" : notifying ? "Envoi…" : "📧 Envoyer au locataire"}
              </button>
            )}
          </div>

          {/* Aperçu signatures */}
          <div className="flex gap-6 flex-wrap mt-2">
            {edl.signatureBailleur && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Bailleur — {edl.signatureBailleurAt ? new Date(edl.signatureBailleurAt).toLocaleDateString("fr-FR") : ""}</p>
                <Image src={edl.signatureBailleur} alt="Signature bailleur" width={160} height={60} className="border rounded" unoptimized />
              </div>
            )}
            {edl.signatureLocataire && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Locataire — {edl.signatureLocataireAt ? new Date(edl.signatureLocataireAt).toLocaleDateString("fr-FR") : ""}</p>
                <Image src={edl.signatureLocataire} alt="Signature locataire" width={160} height={60} className="border rounded" unoptimized />
              </div>
            )}
          </div>

          {isBoth && (
            <div className="flex gap-3 pt-2">
              <Link
                href={`/edl/${edl.token}`}
                target="_blank"
                className="text-sm text-blue-600 hover:underline"
              >
                🔗 Voir la version locataire
              </Link>
            </div>
          )}
        </section>

      </main>

      {/* Modal signature bailleur */}
      {showSignature && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Signature du bailleur</h3>
            <SignatureCanvas
              onSign={handleSignBailleur}
              onCancel={() => setShowSignature(false)}
              loading={signing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
