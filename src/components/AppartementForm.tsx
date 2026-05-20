"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BAIL_TYPES } from "@/lib/bail-types";

type Photo = { id: number; url: string; ordre: number };
type Video = { id: number; url: string; type: string };

type FormData = {
  titre: string; description: string; surface: string; nbPieces: string;
  etage: string; loyer: string;
  montantCharges: string; detailCharges: string;
  dpeClasse: string; disponible: boolean; specificites: string;
  adresse: string; ville: string;
  typeBail: string;
  typeChauffage: string;
  courExtVegetalisee: boolean;
  loyerPrecedentLocataire: string;
  coutEnergMensuel: string;
  pdl: string;
};

type Props = {
  appartementId?: number;
  initial?: Partial<FormData>;
  initialPhotos?: Photo[];
  initialVideos?: Video[];
  dpePdfInitial?: string;
};

const EMPTY: FormData = {
  titre: "", description: "", surface: "", nbPieces: "", etage: "",
  loyer: "", montantCharges: "", detailCharges: "",
  dpeClasse: "", disponible: true, specificites: "", adresse: "", ville: "",
  typeBail: "meuble",
  typeChauffage: "", courExtVegetalisee: false,
  loyerPrecedentLocataire: "", coutEnergMensuel: "", pdl: "",
};

export default function AppartementForm({ appartementId, initial, initialPhotos = [], initialVideos = [], dpePdfInitial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    ...EMPTY,
    ...initial,
    // Les booléens ne doivent jamais être undefined (uncontrolled checkbox)
    disponible: initial?.disponible ?? true,
    typeBail: initial?.typeBail ?? "meuble",
    courExtVegetalisee: Boolean(initial?.courExtVegetalisee),
  });
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [dpePdf, setDpePdf] = useState<string | null>(dpePdfInitial ?? null);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    return data.url;
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const url = await uploadFile(file);
      if (appartementId) {
        const res = await fetch(`/api/appartements/${appartementId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, ordre: photos.length }),
        });
        const photo = await res.json();
        setPhotos((prev) => [...prev, photo]);
      } else {
        setPhotos((prev) => [...prev, { id: Date.now(), url, ordre: prev.length }]);
      }
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDpeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    setDpePdf(url);
    set("dpeClasse", form.dpeClasse);
    setUploading(false);
  }

  async function deletePhoto(photo: Photo) {
    if (appartementId) {
      await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  function handleDragStart(id: number) {
    setDragId(id);
  }

  function handleDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to   = prev.findIndex((p) => p.id === targetId);
      if (from === -1 || to === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated.map((p, i) => ({ ...p, ordre: i }));
    });
  }

  async function handleDragEnd() {
    setDragId(null);
    if (!appartementId) return;
    await fetch("/api/photos/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(photos.map((p, i) => ({ id: p.id, ordre: i }))),
    });
  }

  async function addVideo() {
    if (!newVideoUrl.trim()) return;
    const type = newVideoUrl.includes("youtu") ? "youtube" : newVideoUrl.includes("vimeo") ? "vimeo" : "local";
    if (appartementId) {
      const res = await fetch(`/api/appartements/${appartementId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newVideoUrl, type }),
      });
      const video = await res.json();
      setVideos((prev) => [...prev, video]);
    } else {
      setVideos((prev) => [...prev, { id: Date.now(), url: newVideoUrl, type }]);
    }
    setNewVideoUrl("");
  }

  async function deleteVideo(video: Video) {
    if (appartementId) {
      await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
    }
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = { ...form, dpePdf };

      if (appartementId) {
        const res = await fetch(`/api/appartements/${appartementId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Erreur serveur (${res.status})`);
        }
      } else {
        const res = await fetch("/api/appartements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Erreur serveur (${res.status})`);
        }
        const appart = await res.json();

        for (const photo of photos) {
          await fetch(`/api/appartements/${appart.id}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: photo.url, ordre: photo.ordre }),
          });
        }
        for (const video of videos) {
          await fetch(`/api/appartements/${appart.id}/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: video.url, type: video.type }),
          });
        }
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Informations principales */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Informations générales</h2>

        <div>
          <label className="label">Titre *</label>
          <input type="text" value={form.titre} onChange={(e) => set("titre", e.target.value)} required className="input" placeholder="Ex. Bel appartement T3 lumineux" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Adresse</label>
            <input type="text" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} className="input" placeholder="12 rue des Lilas" />
          </div>
          <div>
            <label className="label">Ville</label>
            <input type="text" value={form.ville} onChange={(e) => set("ville", e.target.value)} className="input" placeholder="Paris" />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className="input resize-none" placeholder="Décrivez l'appartement…" />
        </div>

        <div>
          <label className="label">Spécificités / équipements</label>
          <textarea rows={3} value={form.specificites} onChange={(e) => set("specificites", e.target.value)} className="input resize-none" placeholder="Parking, cave, digicode, double vitrage…" />
        </div>
      </section>

      {/* Caractéristiques */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Caractéristiques</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Surface (m²) *</label>
            <input type="number" min="0" step="0.1" value={form.surface} onChange={(e) => set("surface", e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">Nb de pièces *</label>
            <input type="number" min="1" value={form.nbPieces} onChange={(e) => set("nbPieces", e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">Étage</label>
            <input type="number" min="0" value={form.etage} onChange={(e) => set("etage", e.target.value)} className="input" placeholder="0 = RDC" />
          </div>
          <div>
            <label className="label">DPE</label>
            <select value={form.dpeClasse} onChange={(e) => set("dpeClasse", e.target.value)} className="input">
              <option value="">—</option>
              {["A","B","C","D","E","F","G"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Loyer HC (€/mois) *</label>
            <input type="number" min="0" step="0.01" value={form.loyer} onChange={(e) => set("loyer", e.target.value)} required className="input" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.disponible} onChange={(e) => set("disponible", e.target.checked)} className="rounded" />
              Disponible
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Montant des charges (€/mois)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.montantCharges}
              onChange={(e) => set("montantCharges", e.target.value)}
              className="input"
              placeholder="Ex. 150"
            />
          </div>
        </div>

        <div>
          <label className="label">Détail des charges incluses</label>
          <textarea
            rows={3}
            value={form.detailCharges}
            onChange={(e) => set("detailCharges", e.target.value)}
            className="input resize-none"
            placeholder="Ex. Eau froide, chauffage collectif, entretien parties communes, ordures ménagères…"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Type de location</label>
            <select
              value={form.typeBail}
              onChange={(e) => set("typeBail", e.target.value)}
              className="input"
            >
              {BAIL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type de chauffage</label>
            <select value={form.typeChauffage} onChange={(e) => set("typeChauffage", e.target.value)} className="input">
              <option value="">— Non précisé —</option>
              <option value="individuel_gaz">Individuel au gaz</option>
              <option value="individuel_electrique">Individuel électrique</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.courExtVegetalisee}
                onChange={(e) => set("courExtVegetalisee", e.target.checked)}
                className="rounded"
              />
              Cour extérieure végétalisée
            </label>
          </div>
        </div>
      </section>

      {/* Données locatives internes */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Données locatives internes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ces informations n&apos;apparaissent pas en FO mais figurent dans le bail.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Loyer du précédent locataire (€/mois)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.loyerPrecedentLocataire}
              onChange={(e) => set("loyerPrecedentLocataire", e.target.value)}
              className="input"
              placeholder="Ex. 480"
            />
          </div>
          <div>
            <label className="label">Coûts énergétiques du précédent locataire (€/mois)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.coutEnergMensuel}
              onChange={(e) => set("coutEnergMensuel", e.target.value)}
              className="input"
              placeholder="Ex. 65"
            />
          </div>
          <div>
            <label className="label">PDL — Point De Livraison électricité</label>
            <input
              type="text"
              value={form.pdl}
              onChange={(e) => set("pdl", e.target.value)}
              className="input"
              placeholder="Ex. 30001234567890"
            />
          </div>
        </div>
      </section>

      {/* Photos */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Photos</h2>
          {photos.length > 1 && (
            <p className="text-xs text-gray-400">Glisser-déposer pour réordonner · La 1ère est la photo de couverture</p>
          )}
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(photo.id)}
                onDragOver={(e) => handleDragOver(e, photo.id)}
                onDragEnd={handleDragEnd}
                className={`relative h-28 w-36 rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing select-none transition-opacity ${
                  dragId === photo.id ? "opacity-40 ring-2 ring-blue-400" : ""
                }`}
              >
                <Image src={photo.url} alt="" fill sizes="144px" className="object-cover pointer-events-none" unoptimized={photo.url.startsWith("/uploads/")} />

                {/* Badge couverture */}
                {index === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <span className="text-white text-[10px] font-semibold tracking-wide uppercase">⭐ Couverture</span>
                  </div>
                )}

                {/* Numéro */}
                {index > 0 && (
                  <div className="absolute bottom-1.5 left-2 bg-black/50 text-white text-[10px] rounded px-1.5 py-0.5 font-medium">
                    {index + 1}
                  </div>
                )}

                {/* Supprimer */}
                <button
                  type="button"
                  onClick={() => deletePhoto(photo)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          <span className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            {uploading ? "Téléversement…" : "+ Ajouter des photos"}
          </span>
        </label>
      </section>

      {/* Vidéos */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Vidéos</h2>
        {videos.length > 0 && (
          <ul className="space-y-2">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="truncate flex-1">{v.url}</span>
                <button type="button" onClick={() => deleteVideo(v)} className="text-red-500 hover:text-red-700 flex-shrink-0">Supprimer</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="url"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            placeholder="URL YouTube ou Vimeo"
            className="input flex-1"
          />
          <button type="button" onClick={addVideo} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0">
            Ajouter
          </button>
        </div>
      </section>

      {/* DPE PDF */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Document DPE (PDF)</h2>
        {dpePdf && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>📄</span>
            <a href={dpePdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{dpePdf}</a>
            <button type="button" onClick={() => setDpePdf(null)} className="text-red-500 hover:text-red-700 ml-1">Supprimer</button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="file" accept=".pdf" onChange={handleDpeUpload} className="hidden" disabled={uploading} />
          <span className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            {uploading ? "Téléversement…" : dpePdf ? "Remplacer le PDF" : "+ Joindre le DPE"}
          </span>
        </label>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : appartementId ? "Mettre à jour" : "Créer l'appartement"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
