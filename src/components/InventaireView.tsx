"use client";

import { useEffect, useState } from "react";
import type { Ligne } from "./InventaireEditor";

type Data = {
  dateEntree: string | null;
  lignes: Ligne[];
  remarqueCuisine: string | null;
  remarqueSDB: string | null;
  remarquePiece: string | null;
  remarqueGeneral: string | null;
};

export default function InventaireView({ appartementId, titre }: { appartementId: number; titre: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventaire/${appartementId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appartementId]);

  if (loading) return null;
  if (!data || data.lignes.length === 0) return null;

  const dateLabel = data.dateEntree
    ? new Date(data.dateEntree).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const remarques = [
    { label: "Cuisine", value: data.remarqueCuisine },
    { label: "Salle de bain", value: data.remarqueSDB },
    { label: "Pièce principale", value: data.remarquePiece },
    { label: "Général", value: data.remarqueGeneral },
  ].filter((r) => r.value);

  return (
    <>
      {/* ── CSS impression ──────────────────────────────── */}
      <style>{`
        @media screen {
          #inventaire-print-fo {
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
          #inventaire-print-fo { visibility: visible; position: fixed; top: 0; left: 0; width: 100%; }
          #inventaire-print-fo * { visibility: visible; }
          @page { size: A4; margin: 15mm 12mm; }
        }
      `}</style>

      {/* ── Zone impression ─────────────────────────────── */}
      <div id="inventaire-print-fo">
        <PrintableInventaireView titre={titre} data={data} dateLabel={dateLabel} remarques={remarques} />
      </div>

      {/* ── Affichage public ────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Inventaire du logement</h2>
            {dateLabel && (
              <p className="text-sm text-gray-500 mt-0.5">État des lieux du {dateLabel}</p>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            🖨 Télécharger PDF
          </button>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Objet</th>
                <th className="px-4 py-3 text-center font-medium whitespace-nowrap">Qté entrée</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">État entrée</th>
                <th className="px-4 py-3 text-center font-medium whitespace-nowrap">Qté sortie</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">État sortie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.lignes.map((l, i) => (
                <tr key={l.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{l.objet}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{l.nbEntree || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{l.etatEntree || "—"}</td>
                  <td className="px-4 py-2.5 text-center text-gray-400">{l.nbSortie || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-400">{l.etatSortie || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Remarques */}
        {remarques.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {remarques.map((r) => (
              <div key={r.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{r.label}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ── Composant imprimable FO ────────────────────────────────────────────── */
function PrintableInventaireView({
  titre, data, dateLabel, remarques,
}: {
  titre: string;
  data: Data;
  dateLabel: string | null;
  remarques: { label: string; value: string | null }[];
}) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#000" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "16pt", fontWeight: "bold", margin: "0 0 4px" }}>
          Inventaire — {titre}
        </h1>
        {dateLabel && (
          <p style={{ margin: 0, fontSize: "10pt", color: "#555" }}>
            État des lieux du {dateLabel}
          </p>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "10pt" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            {["Objet", "Qté entrée", "État entrée", "Qté sortie", "État sortie"].map((h) => (
              <th key={h} style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "left", fontWeight: "bold" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((l, i) => (
            <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{l.objet}</td>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>{l.nbEntree || "—"}</td>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{l.etatEntree || "—"}</td>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px", textAlign: "center" }}>{l.nbSortie || "—"}</td>
              <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{l.etatSortie || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {remarques.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "12pt", fontWeight: "bold", marginBottom: "10px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
            Remarques
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
            <tbody>
              {remarques.map((r) => (
                <tr key={r.label}>
                  <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", fontWeight: "bold", width: "25%", backgroundColor: "#f9fafb", verticalAlign: "top" }}>
                    {r.label}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", whiteSpace: "pre-wrap" }}>
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center", width: "40%" }}>
          <div style={{ borderTop: "1px solid #000", paddingTop: "8px", fontSize: "10pt" }}>
            Signature du bailleur
          </div>
        </div>
        <div style={{ textAlign: "center", width: "40%" }}>
          <div style={{ borderTop: "1px solid #000", paddingTop: "8px", fontSize: "10pt" }}>
            Signature du locataire
          </div>
        </div>
      </div>
    </div>
  );
}
