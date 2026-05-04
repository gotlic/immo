"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />,
});

const InventaireView = dynamic(() => import("@/components/InventaireView"), { ssr: false });

/* ── Modal Inventaire ─────────────────────────────────────────── */
function InventaireModal({ appartementId, titre, onClose }: { appartementId: number; titre: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Inventaire du logement</h2>
            <p className="text-xs text-gray-400 mt-0.5">{titre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none transition-colors">×</button>
        </div>
        <div className="px-6 pb-6">
          <InventaireView appartementId={appartementId} titre={titre} />
        </div>
      </div>
    </div>
  );
}

const DPE_COLORS: Record<string, string> = {
  A: "bg-green-600", B: "bg-green-400", C: "bg-yellow-400",
  D: "bg-orange-400", E: "bg-orange-500", F: "bg-red-500", G: "bg-red-700",
};

type Photo = { id: number; url: string; ordre: number };
type Video = { id: number; url: string; type: string };
type Appartement = {
  id: number; titre: string; description: string | null;
  surface: number; nbPieces: number; etage: number | null;
  loyer: number; montantCharges: number | null;
  detailCharges: string | null; dpeClasse: string | null;
  dpePdf: string | null; disponible: boolean; specificites: string | null;
  adresse: string | null; ville: string | null;
  typeChauffage: string | null; courExtVegetalisee: boolean;
  photos: Photo[]; videos: Video[];
};

function getYoutubeWatchUrl(url: string): string {
  // Normalise youtu.be/ID → youtube.com/watch?v=ID
  const short = url.match(/youtu\.be\/([^?&\s]+)/);
  if (short) return `https://www.youtube.com/watch?v=${short[1]}`;
  return url;
}

/* ── Lightbox ────────────────────────────────────────────── */
function Lightbox({ photos, startIndex, onClose }: {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Fermer */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light leading-none z-10"
        onClick={onClose}
      >
        ×
      </button>

      {/* Compteur */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {index + 1} / {photos.length}
      </div>

      {/* Image */}
      <div
        className="relative w-full h-full max-w-5xl max-h-[90vh] mx-auto px-16"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photos[index].url}
          alt={`Photo ${index + 1}`}
          fill
          className="object-contain"
          sizes="90vw"
        />
      </div>

      {/* Flèches */}
      {photos.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full w-12 h-12 flex items-center justify-center text-2xl transition-colors"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            ‹
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full w-12 h-12 flex items-center justify-center text-2xl transition-colors"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function AppartementPage() {
  const { id } = useParams<{ id: string }>();
  const [appart, setAppart] = useState<Appartement | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [inventaireOpen, setInventaireOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/appartements/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setAppart(data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  if (!appart) return notFound();

  const photos = appart.photos;

  return (
    <div className="min-h-screen">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Modal Inventaire */}
      {inventaireOpen && (
        <InventaireModal
          appartementId={appart.id}
          titre={appart.titre}
          onClose={() => setInventaireOpen(false)}
        />
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">← Retour</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700 truncate">{appart.titre}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Colonne gauche ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Galerie */}
            {photos.length > 0 && (
              <div className="space-y-2">
                {/* Photo principale */}
                <div
                  className="relative h-80 bg-gray-100 rounded-xl overflow-hidden cursor-zoom-in"
                  onClick={() => setLightboxIndex(0)}
                >
                  <Image
                    src={photos[0].url}
                    alt={appart.titre}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    priority
                  />
                  {!appart.disponible && (
                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                      <span className="text-white font-bold text-xl bg-gray-800 px-4 py-2 rounded-full">Loué</span>
                    </div>
                  )}
                  {photos.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      1 / {photos.length} · Cliquer pour voir toutes les photos
                    </div>
                  )}
                </div>

                {/* Grille miniatures */}
                {photos.length > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {photos.slice(1, 5).map((p, i) => {
                      const isLast = i === 3 && photos.length > 5;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setLightboxIndex(i + 1)}
                          className="relative h-28 sm:h-20 rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Image src={p.url} alt="" fill className="object-cover hover:scale-105 transition-transform duration-200" sizes="20vw" />
                          {isLast && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
                              +{photos.length - 4}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bouton(s) 360° */}
            {appart.videos.length > 0 && (
              <div className="flex flex-col gap-2">
                {appart.videos.map((v) => (
                  <a
                    key={v.id}
                    href={getYoutubeWatchUrl(v.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full bg-gray-900 hover:bg-gray-700 text-white rounded-xl px-5 py-4 font-medium transition-colors"
                  >
                    <span className="text-2xl leading-none">⟳</span>
                    <span>Voir en 360°</span>
                    <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}

            {/* Description */}
            {appart.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{appart.description}</p>
              </div>
            )}

            {/* Spécificités */}
            {appart.specificites && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Caractéristiques</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{appart.specificites}</p>
              </div>
            )}
          </div>

          {/* ── Colonne droite ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{appart.titre}</h1>
                {appart.adresse && <p className="text-sm text-gray-500 mt-0.5">{appart.adresse}</p>}
                {appart.ville && <p className="text-sm text-gray-500">{appart.ville}</p>}
              </div>

              {/* Carte localisation */}
              {(appart.adresse || appart.ville) && (
                <div style={{ isolation: "isolate" }}>
                  <MapView
                    address={[appart.adresse, appart.ville].filter(Boolean).join(", ")}
                    label={appart.titre}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-gray-900">
                    {appart.loyer.toLocaleString("fr-FR")} €
                  </span>
                  <span className="text-sm text-gray-500">HC / mois</span>
                </div>
                {appart.montantCharges !== null && (
                  <>
                    <p className="text-sm text-gray-500">
                      + {appart.montantCharges.toLocaleString("fr-FR")} € de charges
                    </p>
                    <p className="text-base font-semibold text-gray-700">
                      = {(appart.loyer + appart.montantCharges).toLocaleString("fr-FR")} € CC / mois
                    </p>
                  </>
                )}
              </div>

              {appart.detailCharges && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Charges incluses</p>
                  <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">{appart.detailCharges}</p>
                </div>
              )}

              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${appart.disponible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                {appart.disponible ? "Disponible" : "Loué"}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Surface</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{appart.surface} m²</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Pièces</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{appart.nbPieces}</div>
                </div>
                {appart.etage !== null && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Étage</div>
                    <div className="font-semibold text-gray-900 mt-0.5">{appart.etage === 0 ? "RDC" : `${appart.etage}e`}</div>
                  </div>
                )}
                {appart.dpeClasse && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">DPE</div>
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold mt-0.5 ${DPE_COLORS[appart.dpeClasse] ?? "bg-gray-500"}`}>
                      {appart.dpeClasse}
                    </div>
                  </div>
                )}
                {appart.typeChauffage && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Chauffage</div>
                    <div className="font-semibold text-gray-900 mt-0.5 text-sm">
                      {appart.typeChauffage === "individuel_gaz" ? "Individuel au gaz" : "Individuel électrique"}
                    </div>
                  </div>
                )}
              </div>
              {appart.courExtVegetalisee && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                  <span>🌿</span>
                  <span>Cour extérieure végétalisée</span>
                </div>
              )}
            </div>

            {appart.dpePdf && (
              <a href={appart.dpePdf} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <span>📄</span>
                <span>Télécharger le DPE</span>
              </a>
            )}

            <button
              onClick={() => setInventaireOpen(true)}
              className="flex items-center gap-2 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>📋</span>
              <span>Inventaire du logement</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
