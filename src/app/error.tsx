"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Chunk load error after a new deployment → force reload to get fresh assets
    if (error?.name === "ChunkLoadError" || error?.message?.includes("Loading chunk")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-xl font-semibold text-gray-900">Une erreur est survenue</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          {error.message || "Erreur inattendue. Veuillez réessayer."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            Réessayer
          </button>
          <Link href="/" className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
