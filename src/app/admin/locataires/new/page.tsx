"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { isValidEmail, isValidPhoneFR } from "@/lib/validators";

type Appartement = { id: number; titre: string; adresse: string | null; ville: string | null; etage: number | null };

type Form = {
  appartementId: string;
  prenomNom: string; mailLocataire: string; tel: string;
  adresseLocataire: string; dateNaissance: string;
  villeNaissance: string; departementNaissance: string;
  dateDebut: string; irlTrimestre: string; irlValeur: string;
  loyerReference: string; loyerReferenceMaj: string;
  pasDeGarant: boolean;
  garantCivilite: string; garantPrenomNom: string;
  garantDateNaissance: string; garantAdresse: string; garantEmail: string;
};

const EMPTY_FORM: Omit<Form, "appartementId"> = {
  prenomNom: "", mailLocataire: "", tel: "",
  adresseLocataire: "", dateNaissance: "",
  villeNaissance: "", departementNaissance: "",
  dateDebut: "", irlTrimestre: "", irlValeur: "",
  loyerReference: "", loyerReferenceMaj: "",
  pasDeGarant: false,
  garantCivilite: "M.", garantPrenomNom: "",
  garantDateNaissance: "", garantAdresse: "", garantEmail: "",
};

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string | null; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function NewLocatairePage() {
  const router = useRouter();
  const [appartements, setAppartements] = useState<Appartement[]>([]);
  const [saving, setSaving] = useState(false);
  const [showGarant, setShowGarant] = useState(false);
  const [form, setForm] = useState<Form>({ appartementId: "", ...EMPTY_FORM });
  // Champs touchés (pour n'afficher les erreurs qu'après interaction)
  const [touched, setTouched] = useState<Set<keyof Form>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    fetch("/api/appartements").then((r) => r.json()).then(setAppartements);
    fetch("/api/baux/latest-irl")
      .then((r) => r.json())
      .then((d) => {
        if (d.irlTrimestre) setForm((prev) => ({ ...prev, irlTrimestre: d.irlTrimestre, irlValeur: d.irlValeur ?? "" }));
      });
  }, []);

  function set(key: keyof Form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function touch(key: keyof Form) {
    setTouched((prev) => new Set(prev).add(key));
  }

  function err(key: keyof Form): string | null {
    if (!touched.has(key) && !submitAttempted) return null;
    if (key === "mailLocataire") {
      const v = form.mailLocataire.trim();
      if (!v) return null; // optionnel
      return isValidEmail(v) ? null : "Format invalide — ex. prenom@email.fr";
    }
    if (key === "tel") {
      const v = form.tel.trim();
      if (!v) return null; // optionnel
      return isValidPhoneFR(v) ? null : "Format invalide — ex. 06 12 34 56 78";
    }
    if (key === "garantEmail") {
      const v = form.garantEmail.trim();
      if (!v) return null;
      return isValidEmail(v) ? null : "Format invalide — ex. garant@email.fr";
    }
    return null;
  }

  function hasErrors(): boolean {
    const emailOk = !form.mailLocataire.trim() || isValidEmail(form.mailLocataire);
    const telOk = !form.tel.trim() || isValidPhoneFR(form.tel);
    const garantEmailOk = !showGarant || !form.garantEmail.trim() || isValidEmail(form.garantEmail);
    return !emailOk || !telOk || !garantEmailOk;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!form.appartementId || hasErrors()) return;
    setSaving(true);
    const res = await fetch("/api/baux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pasDeGarant: !showGarant }),
    });
    const bail = await res.json();
    router.push(`/admin/locataires/${bail.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 font-medium">Back office</Link>
          <span className="text-gray-300">/</span>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← Retour</button>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-900">Nouveau locataire</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Appartement + Bail */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Appartement & bail</h2>
            <Field label="Appartement" required>
              <select value={form.appartementId} onChange={(e) => set("appartementId", e.target.value)} required className="input">
                <option value="">— Sélectionner —</option>
                {appartements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.titre}{a.etage !== null ? ` (${a.etage === 0 ? "RDC" : `${a.etage}e ét.`})` : ""}{a.ville ? ` · ${a.ville}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date de début du bail">
                <input type="date" value={form.dateDebut} onChange={(e) => set("dateDebut", e.target.value)} className="input" />
              </Field>
              <Field label="IRL trimestre">
                <input type="text" value={form.irlTrimestre} onChange={(e) => set("irlTrimestre", e.target.value)} className="input" placeholder="ex. T1 2025" />
              </Field>
              <Field label="Valeur IRL">
                <input type="text" value={form.irlValeur} onChange={(e) => set("irlValeur", e.target.value)} className="input" placeholder="ex. 146.6" />
              </Field>
              <Field label="Loyer de référence (€/m²)">
                <input type="text" value={form.loyerReference} onChange={(e) => set("loyerReference", e.target.value)} className="input" placeholder="ex. 12.50" />
              </Field>
            </div>
          </section>

          {/* Locataire */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Locataire</h2>

            <Field label="Email" error={err("mailLocataire")}>
              <input
                type="email"
                value={form.mailLocataire}
                onChange={(e) => set("mailLocataire", e.target.value)}
                onBlur={() => touch("mailLocataire")}
                className={`input ${err("mailLocataire") ? "border-red-400 focus:ring-red-300" : ""}`}
                placeholder="email@exemple.fr"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom complet" required>
                <input
                  type="text"
                  value={form.prenomNom}
                  onChange={(e) => set("prenomNom", e.target.value)}
                  className="input"
                  placeholder="Prénom Nom"
                  required
                />
              </Field>
              <Field label="Téléphone" error={err("tel")}>
                <input
                  type="tel"
                  value={form.tel}
                  onChange={(e) => set("tel", e.target.value)}
                  onBlur={() => touch("tel")}
                  className={`input ${err("tel") ? "border-red-400 focus:ring-red-300" : ""}`}
                  placeholder="06 xx xx xx xx"
                />
              </Field>
              <Field label="Date de naissance">
                <input type="date" value={form.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} className="input" />
              </Field>
              <Field label="Ville de naissance">
                <input type="text" value={form.villeNaissance} onChange={(e) => set("villeNaissance", e.target.value)} className="input" placeholder="Paris" />
              </Field>
              <Field label="Département de naissance">
                <input type="text" value={form.departementNaissance} onChange={(e) => set("departementNaissance", e.target.value)} className="input" placeholder="75" />
              </Field>
            </div>

            <Field label="Adresse du locataire">
              <AddressAutocomplete
                value={form.adresseLocataire}
                onChange={(v) => set("adresseLocataire", v)}
                placeholder="12 rue de la Paix, 75001 Paris"
              />
            </Field>
          </section>

          {/* Garant */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Garant</h2>
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setShowGarant(true)}
                  className={`px-3 py-1 rounded-full transition-colors ${showGarant ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}>
                  Avec garant
                </button>
                <button type="button" onClick={() => setShowGarant(false)}
                  className={`px-3 py-1 rounded-full transition-colors ${!showGarant ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}>
                  Sans garant
                </button>
              </div>
            </div>
            {showGarant && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Civilité">
                  <select value={form.garantCivilite} onChange={(e) => set("garantCivilite", e.target.value)} className="input">
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                  </select>
                </Field>
                <Field label="Nom complet">
                  <input type="text" value={form.garantPrenomNom} onChange={(e) => set("garantPrenomNom", e.target.value)} className="input" placeholder="Prénom Nom" />
                </Field>
                <Field label="Date de naissance">
                  <input type="date" value={form.garantDateNaissance} onChange={(e) => set("garantDateNaissance", e.target.value)} className="input" />
                </Field>
                <Field label="Email" error={err("garantEmail")}>
                  <input
                    type="email"
                    value={form.garantEmail}
                    onChange={(e) => set("garantEmail", e.target.value)}
                    onBlur={() => touch("garantEmail")}
                    className={`input ${err("garantEmail") ? "border-red-400 focus:ring-red-300" : ""}`}
                    placeholder="garant@exemple.fr"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Adresse">
                    <AddressAutocomplete
                      value={form.garantAdresse}
                      onChange={(v) => set("garantAdresse", v)}
                      placeholder="Adresse complète"
                    />
                  </Field>
                </div>
              </div>
            )}
          </section>

          {/* Bouton */}
          <button
            type="submit"
            disabled={saving || !form.appartementId}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Création…" : "Créer la fiche locataire"}
          </button>

        </form>
      </main>
    </div>
  );
}
