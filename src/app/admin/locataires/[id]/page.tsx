"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Edl = { id: number; type: string; status: string; date: string | null };
type Fiche = {
  id: number; token: string; status: string; archived: boolean;
  prenomNom: string | null; dateNaissance: string | null;
  villeNaissance: string | null; departementNaissance: string | null;
  adresseLocataire: string | null; tel: string | null;
  mailLocataire: string | null; emailInvitation: string | null;
  dateDebut: string | null; irlTrimestre: string | null; irlValeur: string | null;
  loyerReference: string | null; loyerReferenceMaj: string | null;
  pasDeGarant: boolean;
  garantCivilite: string | null; garantPrenomNom: string | null;
  garantDateNaissance: string | null; garantAdresse: string | null;
  garantEmail: string | null;
  appartement: {
    id: number; titre: string; adresse: string | null; ville: string | null;
    etage: number | null; surface: number; nbPieces: number;
    loyer: number; montantCharges: number | null;
  };
  inventaireId: number | null;
  edlEntree: Edl | null;
  edlSortie: Edl | null;
};

type EditForm = {
  prenomNom: string; dateNaissance: string; villeNaissance: string;
  departementNaissance: string; adresseLocataire: string; tel: string; mailLocataire: string;
  dateDebut: string; irlTrimestre: string; irlValeur: string;
  loyerReference: string; loyerReferenceMaj: string;
  garantCivilite: string; garantPrenomNom: string; garantDateNaissance: string;
  garantAdresse: string; garantEmail: string;
};

const EDL_STATUS: Record<string, { label: string; color: string }> = {
  draft:          { label: "Brouillon",            color: "bg-gray-100 text-gray-500" },
  signed_bailleur:{ label: "En attente locataire", color: "bg-blue-50 text-blue-600" },
  signed_both:    { label: "Signé ✓",              color: "bg-green-50 text-green-700" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({ label, value, field, editing, form, onChange }: {
  label: string; value: React.ReactNode; field?: keyof EditForm;
  editing?: boolean; form?: EditForm; onChange?: (k: keyof EditForm, v: string) => void;
}) {
  if (editing && field && form && onChange) {
    return (
      <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0 items-center">
        <span className="text-sm text-gray-400 w-48 flex-shrink-0">{label}</span>
        {field === "garantCivilite" ? (
          <select
            value={form[field]}
            onChange={(e) => onChange(field, e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-gray-400 bg-white"
          >
            <option value="">—</option>
            <option value="M.">M.</option>
            <option value="Mme">Mme</option>
          </select>
        ) : (
          <input
            type={field === "mailLocataire" || field === "garantEmail" ? "email" : field === "dateDebut" || field === "dateNaissance" || field === "garantDateNaissance" ? "date" : "text"}
            value={form[field]}
            onChange={(e) => onChange(field, e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-gray-400"
            placeholder={label}
          />
        )}
      </div>
    );
  }
  if (!value) return null;
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-48 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function nextRevisionDate(dateDebut: string): string {
  const d = new Date(dateDebut);
  const now = new Date();
  d.setFullYear(now.getFullYear());
  if (d <= now) d.setFullYear(now.getFullYear() + 1);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ficheToForm(fiche: Fiche): EditForm {
  return {
    prenomNom: fiche.prenomNom ?? "",
    dateNaissance: fiche.dateNaissance ?? "",
    villeNaissance: fiche.villeNaissance ?? "",
    departementNaissance: fiche.departementNaissance ?? "",
    adresseLocataire: fiche.adresseLocataire ?? "",
    tel: fiche.tel ?? "",
    mailLocataire: fiche.mailLocataire ?? fiche.emailInvitation ?? "",
    dateDebut: fiche.dateDebut ?? "",
    irlTrimestre: fiche.irlTrimestre ?? "",
    irlValeur: fiche.irlValeur ?? "",
    loyerReference: fiche.loyerReference ?? "",
    loyerReferenceMaj: fiche.loyerReferenceMaj ?? "",
    garantCivilite: fiche.garantCivilite ?? "",
    garantPrenomNom: fiche.garantPrenomNom ?? "",
    garantDateNaissance: fiche.garantDateNaissance ?? "",
    garantAdresse: fiche.garantAdresse ?? "",
    garantEmail: fiche.garantEmail ?? "",
  };
}

export default function FicheLocatairePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/locataires/${id}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => { if (d) { setFiche(d); setForm(ficheToForm(d)); } });
  }, [id]);

  function handleChange(key: keyof EditForm, val: string) {
    setForm((prev) => prev ? { ...prev, [key]: val } : prev);
  }

  async function handleSave() {
    if (!form || !fiche) return;
    setSaving(true);
    const res = await fetch(`/api/baux/${fiche.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenomNom: form.prenomNom || null,
        dateNaissance: form.dateNaissance || null,
        villeNaissance: form.villeNaissance || null,
        departementNaissance: form.departementNaissance || null,
        adresseLocataire: form.adresseLocataire || null,
        tel: form.tel || null,
        mailLocataire: form.mailLocataire || null,
        dateDebut: form.dateDebut || null,
        irlTrimestre: form.irlTrimestre || null,
        irlValeur: form.irlValeur || null,
        loyerReference: form.loyerReference || null,
        loyerReferenceMaj: form.loyerReferenceMaj || null,
        garantCivilite: form.garantCivilite || null,
        garantPrenomNom: form.garantPrenomNom || null,
        garantDateNaissance: form.garantDateNaissance || null,
        garantAdresse: form.garantAdresse || null,
        garantEmail: form.garantEmail || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setFiche((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
    }
    setSaving(false);
  }

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-gray-400">Locataire introuvable.</div>;
  if (!fiche || !form) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;

  const a = fiche.appartement;
  const email = fiche.mailLocataire ?? fiche.emailInvitation ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 font-medium">Back office</Link>
          <span className="text-gray-300">/</span>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← Retour</button>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-900 truncate flex-1">{fiche.prenomNom ?? "Locataire"}</h1>
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setForm(ficheToForm(fiche)); }}
                className="text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "Sauvegarde…" : "💾 Enregistrer"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ✏️ Modifier
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        {/* En-tête identité */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 flex-shrink-0">
            {fiche.prenomNom ? fiche.prenomNom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-gray-900">{fiche.prenomNom ?? <span className="text-gray-400 font-normal italic">Nom non renseigné</span>}</p>
            {email && <p className="text-sm text-gray-500">{email}</p>}
            {fiche.tel && <p className="text-sm text-gray-500">{fiche.tel}</p>}
          </div>
        </div>

        {/* Liens rapides */}
        <div className="grid grid-cols-3 gap-3">
          <Link href={`/admin/baux/${fiche.id}`} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-gray-400 hover:shadow-sm transition-all">
            <p className="text-2xl mb-1">📄</p>
            <p className="text-xs font-medium text-gray-700">Bail</p>
            <p className="text-xs text-gray-400 mt-0.5">Voir le contrat</p>
          </Link>
          {fiche.edlEntree ? (
            <Link href={`/admin/edl/${fiche.edlEntree.id}`} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-gray-400 hover:shadow-sm transition-all">
              <p className="text-2xl mb-1">🔑</p>
              <p className="text-xs font-medium text-gray-700">EDL Entrée</p>
              <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${EDL_STATUS[fiche.edlEntree.status]?.color}`}>
                {EDL_STATUS[fiche.edlEntree.status]?.label}
              </p>
            </Link>
          ) : fiche.inventaireId ? (
            <Link href={`/admin/edl/new?appartementId=${a.id}&type=entree`} className="bg-white rounded-xl border border-dashed border-gray-300 p-4 text-center hover:border-gray-500 transition-all">
              <p className="text-2xl mb-1 opacity-40">🔑</p>
              <p className="text-xs font-medium text-gray-400">EDL Entrée</p>
              <p className="text-xs text-gray-400 mt-0.5">+ Créer</p>
            </Link>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center opacity-40">
              <p className="text-2xl mb-1">🔑</p>
              <p className="text-xs text-gray-400">Pas d'inventaire</p>
            </div>
          )}
          {fiche.edlSortie ? (
            <Link href={`/admin/edl/${fiche.edlSortie.id}`} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-gray-400 hover:shadow-sm transition-all">
              <p className="text-2xl mb-1">🚪</p>
              <p className="text-xs font-medium text-gray-700">EDL Sortie</p>
              <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${EDL_STATUS[fiche.edlSortie.status]?.color}`}>
                {EDL_STATUS[fiche.edlSortie.status]?.label}
              </p>
            </Link>
          ) : fiche.inventaireId ? (
            <Link href={`/admin/edl/new?appartementId=${a.id}&type=sortie`} className="bg-white rounded-xl border border-dashed border-gray-300 p-4 text-center hover:border-gray-500 transition-all">
              <p className="text-2xl mb-1 opacity-40">🚪</p>
              <p className="text-xs font-medium text-gray-400">EDL Sortie</p>
              <p className="text-xs text-gray-400 mt-0.5">+ Créer</p>
            </Link>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center opacity-40">
              <p className="text-2xl mb-1">🚪</p>
              <p className="text-xs text-gray-400">Pas d'inventaire</p>
            </div>
          )}
        </div>

        {/* Locataire */}
        <Section title="Informations locataire">
          <Row label="Nom complet" value={fiche.prenomNom} field="prenomNom" editing={editing} form={form} onChange={handleChange} />
          <Row label="Email" value={email} field="mailLocataire" editing={editing} form={form} onChange={handleChange} />
          <Row label="Téléphone" value={fiche.tel} field="tel" editing={editing} form={form} onChange={handleChange} />
          <Row label="Adresse" value={fiche.adresseLocataire} field="adresseLocataire" editing={editing} form={form} onChange={handleChange} />
          <Row label="Date de naissance" value={fiche.dateNaissance} field="dateNaissance" editing={editing} form={form} onChange={handleChange} />
          <Row label="Ville de naissance" value={fiche.villeNaissance} field="villeNaissance" editing={editing} form={form} onChange={handleChange} />
          <Row label="Dépt. de naissance" value={fiche.departementNaissance} field="departementNaissance" editing={editing} form={form} onChange={handleChange} />
        </Section>

        {/* Bail & loyer */}
        <Section title="Bail & loyer">
          <Row label="Début du bail" value={fiche.dateDebut ? new Date(fiche.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null} field="dateDebut" editing={editing} form={form} onChange={handleChange} />
          {fiche.dateDebut && !editing && (
            <div className="flex gap-4 py-2 border-b border-gray-50">
              <span className="text-sm text-gray-400 w-48 flex-shrink-0">Prochaine révision</span>
              <span className="text-sm text-orange-600 font-semibold">{nextRevisionDate(fiche.dateDebut)}</span>
            </div>
          )}
          <Row label="IRL trimestre" value={fiche.irlTrimestre} field="irlTrimestre" editing={editing} form={form} onChange={handleChange} />
          <Row label="Valeur IRL" value={fiche.irlValeur} field="irlValeur" editing={editing} form={form} onChange={handleChange} />
          <Row label="Loyer mensuel" value={a.loyer ? `${a.loyer.toLocaleString("fr-FR")} €` : null} />
          <Row label="Charges" value={a.montantCharges ? `${a.montantCharges.toLocaleString("fr-FR")} €/mois` : null} />
          <Row label="Loyer de référence" value={fiche.loyerReference ? `${fiche.loyerReference} €/m²` : null} field="loyerReference" editing={editing} form={form} onChange={handleChange} />
          <Row label="Loyer réf. majoré" value={fiche.loyerReferenceMaj ? `${fiche.loyerReferenceMaj} €/m²` : null} field="loyerReferenceMaj" editing={editing} form={form} onChange={handleChange} />
        </Section>

        {/* Appartement */}
        <Section title="Appartement">
          <Row label="Titre" value={a.titre} />
          <Row label="Adresse" value={[a.adresse, a.ville].filter(Boolean).join(", ")} />
          <Row label="Étage" value={a.etage !== null ? (a.etage === 0 ? "Rez-de-chaussée" : `${a.etage}e étage`) : null} />
          <Row label="Surface" value={`${a.surface} m²`} />
          <Row label="Pièces" value={`${a.nbPieces} pièce${a.nbPieces > 1 ? "s" : ""}`} />
        </Section>

        {/* Garant */}
        <Section title={fiche.pasDeGarant ? "Garant — sans garant" : "Garant"}>
          {fiche.pasDeGarant ? (
            <p className="text-sm text-gray-400 italic">Bail sans garant.</p>
          ) : (
            <>
              <Row label="Civilité" value={fiche.garantCivilite} field="garantCivilite" editing={editing} form={form} onChange={handleChange} />
              <Row label="Nom complet" value={fiche.garantPrenomNom} field="garantPrenomNom" editing={editing} form={form} onChange={handleChange} />
              <Row label="Date de naissance" value={fiche.garantDateNaissance} field="garantDateNaissance" editing={editing} form={form} onChange={handleChange} />
              <Row label="Adresse" value={fiche.garantAdresse} field="garantAdresse" editing={editing} form={form} onChange={handleChange} />
              <Row label="Email" value={fiche.garantEmail} field="garantEmail" editing={editing} form={form} onChange={handleChange} />
            </>
          )}
        </Section>

      </main>
    </div>
  );
}
