"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Inventaire = {
  id: number;
  appartement: { titre: string; adresse: string | null; ville: string | null };
};

function NewEdlForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appartementId = searchParams.get("appartementId");
  const typeParam = searchParams.get("type") as "entree" | "sortie" | null;

  const [inventaire, setInventaire] = useState<Inventaire | null>(null);
  const [type, setType] = useState<"entree" | "sortie">(typeParam ?? "entree");
  const [locataireNom, setLocataireNom] = useState("");
  const [locataireEmail, setLocataireEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appartementId) return;

    // Charger l'inventaire
    fetch(`/api/inventaire/${appartementId}`)
      .then((r) => r.json())
      .then(setInventaire);

    // Auto-remplir depuis le dernier bail signé
    fetch(`/api/baux?appartementId=${appartementId}`)
      .then((r) => r.json())
      .then((baux: { prenomNom?: string | null; mailLocataire?: string | null; emailInvitation?: string | null; status: string }[]) => {
        if (!Array.isArray(baux) || baux.length === 0) return;
        // Prendre le bail le plus avancé (signé > en cours)
        const sorted = [...baux].sort((a, b) => {
          const order = ["signed_both", "signed_tenant", "caution_signed", "info_submitted", "pending"];
          return order.indexOf(a.status) - order.indexOf(b.status);
        });
        const best = sorted[0];
        if (best.prenomNom) setLocataireNom(best.prenomNom);
        const email = best.mailLocataire ?? best.emailInvitation ?? "";
        if (email) setLocataireEmail(email);
      })
      .catch(() => {/* silencieux */});
  }, [appartementId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inventaire) return;
    setSaving(true);
    const res = await fetch("/api/etats-des-lieux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventaireId: inventaire.id, type, locataireNom, locataireEmail }),
    });
    const edl = await res.json();
    router.push(`/admin/edl/${edl.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 font-medium">Back office</Link>
          <span className="text-gray-300">/</span>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← Retour</button>
          <span className="text-gray-300 hidden sm:inline">/</span>
          <h1 className="text-base font-semibold text-gray-900 hidden sm:inline">Nouvel état des lieux</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        {inventaire && (
          <p className="text-sm text-gray-500 mb-6">
            {inventaire.appartement.titre} · {[inventaire.appartement.adresse, inventaire.appartement.ville].filter(Boolean).join(", ")}
          </p>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="label">Type d'état des lieux</label>
            <div className="flex gap-3 mt-1">
              {(["entree", "sortie"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    type === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {t === "entree" ? "🔑 Entrée" : "🚪 Sortie"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Nom du locataire</label>
            <input
              type="text"
              value={locataireNom}
              onChange={(e) => setLocataireNom(e.target.value)}
              className="input"
              placeholder="Prénom Nom"
            />
          </div>

          <div>
            <label className="label">Email du locataire *</label>
            <input
              type="email"
              value={locataireEmail}
              onChange={(e) => setLocataireEmail(e.target.value)}
              className="input"
              placeholder="locataire@exemple.fr"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Création…" : "Créer l'état des lieux"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewEdlPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>}>
      <NewEdlForm />
    </Suspense>
  );
}
