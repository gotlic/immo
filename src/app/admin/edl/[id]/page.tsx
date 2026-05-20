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
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
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
          <div className="p-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Inventaire</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEntree ? "Remplissez les colonnes Entrée." : "Remplissez les colonnes Sortie. La flèche → copie l'état entrée."}
              </p>
            </div>
            {!isEntree && (
              <button
                type="button"
                onClick={() => setLignes((prev) => prev.map((l) => ({ ...l, nbSortie: l.nbEntree, etatSortie: l.etatEntree })))}
                className="shrink-0 flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                title="Copier tous les états d'entrée vers la sortie"
              >
                <span>Tout copier</span>
                <span className="text-base leading-none">→</span>
              </button>
            )}
          </div>

          {/* Vue desktop : tableau */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-44">Objet</th>
                  <th className="text-center px-2 py-2 font-medium text-gray-600 w-14">Nb E.</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">État entrée</th>
                  {!isEntree && <>
                    <th className="w-8"></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 w-14">Nb S.</th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">État sortie</th>
                  </>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-900 font-medium text-sm">{l.objet}</td>
                    <td className="px-2 py-2 text-center">
                      <input type="text" value={l.nbEntree}
                        onChange={(e) => updateLigne(idx, "nbEntree", e.target.value)}
                        className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-gray-400" />
                    </td>
                    <td className="px-2 py-2">
                      <input list="etats-list" type="text" value={l.etatEntree}
                        onChange={(e) => updateLigne(idx, "etatEntree", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-gray-400"
                        placeholder="État…" />
                    </td>
                    {!isEntree && <>
                      <td className="px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => { updateLigne(idx, "nbSortie", l.nbEntree); updateLigne(idx, "etatSortie", l.etatEntree); }}
                          title="Copier depuis l'entrée"
                          className="text-gray-400 hover:text-blue-600 transition-colors text-base leading-none px-1"
                        >→</button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="text" value={l.nbSortie}
                          onChange={(e) => updateLigne(idx, "nbSortie", e.target.value)}
                          className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-gray-400" />
                      </td>
                      <td className="px-2 py-2">
                        <input list="etats-list" type="text" value={l.etatSortie}
                          onChange={(e) => updateLigne(idx, "etatSortie", e.target.value)}
                          className={`w-full border rounded px-2 py-0.5 text-sm focus:outline-none focus:border-gray-400 ${
                            l.etatSortie && l.etatSortie !== l.etatEntree ? "border-orange-300 bg-orange-50" : "border-gray-200"
                          }`}
                          placeholder="État…" />
                      </td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue mobile : cartes */}
          <div className="sm:hidden divide-y divide-gray-100">
            {lignes.map((l, idx) => (
              <div key={l.id} className="px-4 py-3 space-y-2">
                <p className="font-semibold text-gray-900 text-sm">{l.objet}</p>
                {isEntree ? (
                  <div className="flex gap-2">
                    <div className="w-16">
                      <p className="text-xs text-gray-400 mb-0.5">Nb</p>
                      <input type="text" value={l.nbEntree}
                        onChange={(e) => updateLigne(idx, "nbEntree", e.target.value)}
                        className="w-full text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:border-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-0.5">État entrée</p>
                      <input list="etats-list" type="text" value={l.etatEntree}
                        onChange={(e) => updateLigne(idx, "etatEntree", e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-gray-400"
                        placeholder="État…" />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Ligne entrée (lecture) */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-400 w-6 text-center">{l.nbEntree}</span>
                      <span className="text-xs text-gray-500 flex-1">{l.etatEntree || "—"}</span>
                      <button
                        type="button"
                        onClick={() => { updateLigne(idx, "nbSortie", l.nbEntree); updateLigne(idx, "etatSortie", l.etatEntree); }}
                        className="shrink-0 text-blue-500 hover:text-blue-700 font-bold text-base px-1 transition-colors"
                        title="Copier vers sortie"
                      >→</button>
                    </div>
                    {/* Ligne sortie (éditable) */}
                    <div className="flex gap-2">
                      <div className="w-16">
                        <p className="text-xs text-gray-400 mb-0.5">Nb S.</p>
                        <input type="text" value={l.nbSortie}
                          onChange={(e) => updateLigne(idx, "nbSortie", e.target.value)}
                          className="w-full text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:border-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">État sortie</p>
                        <input list="etats-list" type="text" value={l.etatSortie}
                          onChange={(e) => updateLigne(idx, "etatSortie", e.target.value)}
                          className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:border-gray-400 ${
                            l.etatSortie && l.etatSortie !== l.etatEntree ? "border-orange-300 bg-orange-50" : "border-gray-200"
                          }`}
                          placeholder="État…" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
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

      {/* Datalist états */}
      <datalist id="etats-list">
        <option value="Neuf" />
        <option value="Très bon état" />
        <option value="Bon état" />
        <option value="État correct" />
        <option value="Usagé" />
        <option value="Usure normale" />
        <option value="Abîmé" />
        <option value="Dégradé" />
        <option value="Manquant" />
        <option value="À remplacer" />
        <option value="Non vérifié" />
      </datalist>

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
