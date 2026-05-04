"use client";

/**
 * PdfPages — rend chaque page d'un PDF en <img> via pdfjs-dist.
 * Pages empilées, imprimables normalement avec window.print().
 */

import { useEffect, useState } from "react";

interface Props {
  src: string;
  /** Facteur de zoom (1.8 ≈ 150 dpi, bonne qualité pour A4) */
  scale?: number;
}

export default function PdfPages({ src, scale = 1.8 }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setLoading(true);
      setError(null);
      setPages([]);

      try {
        const pdfjsLib = await import("pdfjs-dist");

        // Worker : CDN unpkg (évite les problèmes de bundling ESM en Next.js)
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument(src).promise;
        if (cancelled) return;

        const results: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const ctx = canvas.getContext("2d")!;
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          } as Parameters<typeof page.render>[0]).promise;

          if (cancelled) return;
          results.push(canvas.toDataURL("image/jpeg", 0.93));
        }

        setPages(results);
      } catch (err) {
        if (!cancelled) {
          console.error("[PdfPages] erreur:", err);
          setError(String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [src, scale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        <span className="animate-pulse">Chargement du document…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-red-200 rounded-xl text-red-400 text-sm text-center gap-2 px-4">
        <span>Impossible de charger le PDF.</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="underline text-red-500">
          Ouvrir directement →
        </a>
      </div>
    );
  }

  return (
    <div>
      {pages.map((dataUrl, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={dataUrl}
          alt={`Page ${i + 1}`}
          className="w-full block"
          style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
        />
      ))}
    </div>
  );
}
