"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */
export type Ligne = {
  id: string;
  objet: string;
  nbEntree: string;
  etatEntree: string;
  nbSortie: string;
  etatSortie: string;
};

type Data = {
  dateEntree: string;
  lignes: Ligne[];
  remarqueCuisine: string;
  remarqueSDB: string;
  remarquePiece: string;
  remarqueGeneral: string;
};

/* ── Couleurs par état ──────────────────────────────────────────────────── */
const ETAT_OPTIONS = ["Neuf", "Très bon", "Bon", "Correct", "A remplacer", "Antiquité"] as const;

const ETAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Neuf":        { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300"  },
  "Très bon":    { bg: "bg-teal-100",   text: "text-teal-800",   border: "border-teal-300"   },
  "Bon":         { bg: "bg-lime-100",   text: "text-lime-800",   border: "border-lime-300"   },
  "Correct":     { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  "A remplacer": { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-300"    },
  "Antiquité":   { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300"  },
};

/* ── EtatSelect : ONE control at a time ────────────────────────────────── */
function EtatSelect({ value, onChange, placeholder = "—" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const isPredefined = (ETAT_OPTIONS as readonly string[]).includes(value);
  // texte libre = a value that is neither empty nor in the predefined list
  const [textMode, setTextMode] = useState(!isPredefined && value !== "");

  // sync when parent resets to empty or predefined
  useEffect(() => {
    if (value === "" || (ETAT_OPTIONS as readonly string[]).includes(value)) {
      setTextMode(false);
    }
  }, [value]);

  const c = isPredefined ? ETAT_COLORS[value] : null;
  const selectClass = c
    ? `${c.bg} ${c.text} ${c.border} border rounded px-2 py-1 text-sm font-medium w-full outline-none cursor-pointer`
    : "bg-white text-gray-600 border border-gray-300 rounded px-2 py-1 text-sm w-full outline-none cursor-pointer";

  /* ── Mode texte libre ── */
  if (textMode) {
    return (
      <div className="flex gap-1 items-center">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-400 min-w-0"
          placeholder="Préciser…"
        />
        <button
          type="button"
          onClick={() => { setTextMode(false); onChange(""); }}
          className="text-gray-400 hover:text-gray-600 text-xs px-1"
          title="Retour à la liste"
        >✕</button>
      </div>
    );
  }

  /* ── Mode liste ── */
  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === "__libre__") { setTextMode(true); onChange(""); }
        else onChange(e.target.value);
      }}
      className={selectClass}
    >
      <option value="">{placeholder}</option>
      {ETAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__libre__">Texte libre…</option>
    </select>
  );
}

/* ── QteCell : triangles ▲ ▼ ───────────────────────────────────────────── */
function QteCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const nb = Math.max(1, parseInt(value) || 1);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="w-6 text-center text-sm font-semibold tabular-nums select-none">{nb}</span>
      <div className="flex flex-col gap-px">
        <button type="button" onClick={() => onChange(String(nb + 1))}
          className="w-5 h-[14px] flex items-center justify-center text-gray-400 hover:text-gray-800 transition-colors">
          <svg width="9" height="6" viewBox="0 0 9 6" fill="currentColor"><path d="M4.5 0L9 6H0z"/></svg>
        </button>
        <button type="button" onClick={() => onChange(String(Math.max(1, nb - 1)))} disabled={nb <= 1}
          className="w-5 h-[14px] flex items-center justify-center text-gray-400 hover:text-gray-800 disabled:opacity-25 transition-colors">
          <svg width="9" height="6" viewBox="0 0 9 6" fill="currentColor"><path d="M4.5 6L0 0H9z"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Icônes ─────────────────────────────────────────────────────────────── */
function IconSortie() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function newLigne(): Ligne {
  return { id: uid(), objet: "", nbEntree: "1", etatEntree: "", nbSortie: "", etatSortie: "" };
}
function emptyData(): Data {
  return { dateEntree: "", lignes: [], remarqueCuisine: "", remarqueSDB: "", remarquePiece: "", remarqueGeneral: "" };
}

/* ── Composant principal ────────────────────────────────────────────────── */
export default function InventaireEditor({ appartementId, titre }: { appartementId: number; titre: string }) {
  const [data, setData] = useState<Data>(emptyData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/inventaire/${appartementId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d) setData({
          dateEntree: d.dateEntree ?? "",
          lignes: d.lignes ?? [],
          remarqueCuisine: d.remarqueCuisine ?? "",
          remarqueSDB: d.remarqueSDB ?? "",
          remarquePiece: d.remarquePiece ?? "",
          remarqueGeneral: d.remarqueGeneral ?? "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [appartementId]);

  const setLigne = useCallback((id: string, field: keyof Ligne, value: string) => {
    setData((prev) => ({
      ...prev,
      lignes: prev.lignes.map((l) => l.id === id ? { ...l, [field]: value } : l),
    }));
  }, []);

  function copySortie(id: string) {
    setData((prev) => ({
      ...prev,
      lignes: prev.lignes.map((l) =>
        l.id === id ? { ...l, nbSortie: l.nbEntree, etatSortie: l.etatEntree } : l
      ),
    }));
  }

  function addLigne() { setData((p) => ({ ...p, lignes: [...p.lignes, newLigne()] })); }
  function removeLigne(id: string) { setData((p) => ({ ...p, lignes: p.lignes.filter((l) => l.id !== id) })); }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`/api/inventaire/${appartementId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-40 mb-4" /><div className="h-32 bg-gray-100 rounded" />
    </div>
  );

  const hasSortieAny = data.lignes.some((l) => l.nbSortie || l.etatSortie);

  return (
    <>
      <style>{`
        @media screen {
          #inventaire-print {
            position: absolute;
            left: -9999px;
            top: 0;
            width: 210mm;
            overflow: hidden;
            pointer-events: none;
          }
        }
        @media print {
          body * { visibility: hidden; }
          #inventaire-print { visibility: visible; position: fixed; top: 0; left: 0; width: 100%; }
          #inventaire-print * { visibility: visible; }
          @page { size: A4; margin: 15mm 12mm; }
        }
      `}</style>

      <div id="inventaire-print"><PrintableInventaire titre={titre} data={data} /></div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* En-tête */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-gray-900">📋 Inventaire</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {error && <span className="text-xs text-red-500">{error}</span>}
            {saved && <span className="text-xs text-green-600">✓ Enregistré</span>}
            <button onClick={() => window.print()}
              className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              🖨 Imprimer / PDF
            </button>
            <button onClick={save} disabled={saving}
              className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Date */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date de l&apos;état des lieux</label>
            <input type="date" value={data.dateEntree}
              onChange={(e) => setData((d) => ({ ...d, dateEntree: e.target.value }))}
              className="input max-w-xs" />
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[7%]" />
                <col className="w-[23%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[23%]" />
                <col className="w-[3%]" />
              </colgroup>
              <thead>
                <tr className="text-xs uppercase tracking-wide font-medium">
                  <th className="bg-gray-50 px-3 py-2.5 text-left text-gray-500" />
                  {/* Entrée */}
                  <th className="bg-blue-50 px-2 py-2.5 text-center text-blue-600">Qté</th>
                  <th className="bg-blue-50 px-2 py-2.5 text-left text-blue-600">État entrée</th>
                  {/* Séparateur */}
                  <th className="bg-gray-50 px-2 py-2.5" />
                  {/* Sortie */}
                  <th className={`px-2 py-2.5 text-center ${hasSortieAny ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-300"}`}>Qté</th>
                  <th className={`px-2 py-2.5 text-left ${hasSortieAny ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-300"}`}>État sortie</th>
                  <th className="bg-gray-50 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.lignes.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">
                    Aucun article — cliquez sur &quot;Ajouter un article&quot; ci-dessous.
                  </td></tr>
                )}
                {data.lignes.map((l) => {
                  const hasSortie = !!(l.nbSortie || l.etatSortie);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50/50 align-middle">

                      {/* Objet */}
                      <td className="px-2 py-1.5">
                        <input value={l.objet} onChange={(e) => setLigne(l.id, "objet", e.target.value)}
                          className="w-full border border-transparent hover:border-gray-300 focus:border-blue-400 rounded px-2 py-1 text-sm outline-none bg-transparent focus:bg-white transition-colors"
                          placeholder="Ex. Sommier 90×190" />
                      </td>

                      {/* Qté entrée */}
                      <td className="bg-blue-50/30 px-2 py-1.5">
                        <QteCell value={l.nbEntree} onChange={(v) => setLigne(l.id, "nbEntree", v)} />
                      </td>

                      {/* État entrée */}
                      <td className="bg-blue-50/30 px-2 py-1.5">
                        <EtatSelect value={l.etatEntree} onChange={(v) => setLigne(l.id, "etatEntree", v)} placeholder="— Entrée —" />
                      </td>

                      {/* Bouton copier en sortie */}
                      <td className="px-1 py-1.5 text-center">
                        <button onClick={() => copySortie(l.id)} title="Copier en sortie"
                          className={`mx-auto flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                            hasSortie
                              ? "text-orange-500 bg-orange-50 hover:bg-orange-100"
                              : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                          }`}>
                          <IconSortie />
                        </button>
                      </td>

                      {/* Qté sortie */}
                      <td className={`px-2 py-1.5 transition-colors ${hasSortie ? "bg-orange-50/30" : ""}`}>
                        {hasSortie
                          ? <QteCell value={l.nbSortie || "1"} onChange={(v) => setLigne(l.id, "nbSortie", v)} />
                          : <span className="block text-center text-gray-200 select-none">—</span>
                        }
                      </td>

                      {/* État sortie */}
                      <td className={`px-2 py-1.5 transition-colors ${hasSortie ? "bg-orange-50/30" : ""}`}>
                        {hasSortie ? (
                          <div className="flex items-center gap-1">
                            <div className="flex-1 min-w-0">
                              <EtatSelect value={l.etatSortie} onChange={(v) => setLigne(l.id, "etatSortie", v)} placeholder="— Sortie —" />
                            </div>
                            <button
                              type="button"
                              onClick={() => { setLigne(l.id, "nbSortie", ""); setLigne(l.id, "etatSortie", ""); }}
                              title="Effacer les données de sortie"
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-orange-500 transition-colors rounded hover:bg-orange-50"
                            >✕</button>
                          </div>
                        ) : (
                          <span className="block text-gray-200 select-none text-sm">—</span>
                        )}
                      </td>

                      {/* Supprimer */}
                      <td className="px-1 py-1.5 text-center relative">
                        {confirmDeleteId === l.id ? (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-red-200 rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-1.5 z-10 whitespace-nowrap">
                            <span className="text-xs text-gray-600">Supprimer ?</span>
                            <button
                              onClick={() => { removeLigne(l.id); setConfirmDeleteId(null); }}
                              className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors"
                            >Oui</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
                            >Non</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(l.id)}
                            title="Supprimer la ligne"
                            className="mx-auto flex items-center justify-center w-7 h-7 rounded text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <IconTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={addLigne}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 transition-colors">
            + Ajouter un article
          </button>

          {/* Remarques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {([
              { key: "remarqueCuisine" as const, label: "Remarques — Cuisine" },
              { key: "remarqueSDB"     as const, label: "Remarques — Salle de bain" },
              { key: "remarquePiece"   as const, label: "Remarques — Pièce principale" },
              { key: "remarqueGeneral" as const, label: "Remarques — Général" },
            ]).map(({ key, label }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <textarea value={data[key]} onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
                  rows={3} className="input resize-none" placeholder="Aucune remarque particulière" />
              </div>
            ))}
          </div>
        </div>

        {/* Pied */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          {saved && <span className="text-xs text-green-600 self-center">✓ Enregistré</span>}
          <button onClick={save} disabled={saving}
            className="text-sm bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {saving ? "Enregistrement…" : "Enregistrer l'inventaire"}
          </button>
        </div>
      </section>
    </>
  );
}

/* ── Composant imprimable ───────────────────────────────────────────────── */
function PrintableInventaire({ titre, data }: { titre: string; data: Data }) {
  const dateLabel = data.dateEntree
    ? new Date(data.dateEntree).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";
  const remarques = [
    { label: "Cuisine",          value: data.remarqueCuisine },
    { label: "Salle de bain",    value: data.remarqueSDB },
    { label: "Pièce principale", value: data.remarquePiece },
    { label: "Général",          value: data.remarqueGeneral },
  ].filter((r) => r.value);
  const hasSortieData = data.lignes.some((l) => l.nbSortie || l.etatSortie);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#000" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "16pt", fontWeight: "bold", margin: "0 0 4px" }}>Inventaire — {titre}</h1>
        <p style={{ margin: 0, fontSize: "10pt", color: "#555" }}>État des lieux du {dateLabel}</p>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "10pt" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "left" }}>Objet</th>
            <th style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center" }}>Qté entrée</th>
            <th style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "left" }}>État entrée</th>
            {hasSortieData && <>
              <th style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center" }}>Qté sortie</th>
              <th style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "left" }}>État sortie</th>
            </>}
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((l, i) => (
            <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{l.objet}</td>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>{l.nbEntree || "—"}</td>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{l.etatEntree || "—"}</td>
              {hasSortieData && <>
                <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>{l.nbSortie || "—"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{l.etatSortie || "—"}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
      {remarques.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "12pt", fontWeight: "bold", marginBottom: "10px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>Remarques</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
            <tbody>
              {remarques.map((r) => (
                <tr key={r.label}>
                  <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", fontWeight: "bold", width: "25%", backgroundColor: "#f9fafb", verticalAlign: "top" }}>{r.label}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", whiteSpace: "pre-wrap" }}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center", width: "40%", borderTop: "1px solid #000", paddingTop: "8px", fontSize: "10pt" }}>Signature du bailleur</div>
        <div style={{ textAlign: "center", width: "40%", borderTop: "1px solid #000", paddingTop: "8px", fontSize: "10pt" }}>Signature du locataire</div>
      </div>
    </div>
  );
}
