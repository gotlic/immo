"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { BAIL_TYPES } from "@/lib/bail-types";

export default function BailTemplatesListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">← Retour</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-700">Modèles de baux</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {BAIL_TYPES.map((t) => (
          <Link
            key={t.value}
            href={`/admin/baux/templates/${t.value}`}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-gray-400 hover:shadow-sm transition-all group"
          >
            <span className="text-3xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{t.label}</p>
              <p className="text-sm text-gray-400 mt-0.5">Voir et modifier le modèle</p>
            </div>
            <span className="text-gray-300 group-hover:text-gray-600 text-lg transition-colors">→</span>
          </Link>
        ))}
      </main>
    </div>
  );
}
