"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppartementForm from "@/components/AppartementForm";
import Link from "next/link";

export default function NewAppartementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 font-medium">Back office</Link><span className="text-gray-300">/</span><button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← Retour</button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-700">Nouvel appartement</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <AppartementForm />
      </main>
    </div>
  );
}
