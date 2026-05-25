"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

type BailInfo = {
  id: number;
  prenomNom: string | null;
  adresseLocataire: string | null;
  mailLocataire: string | null;
  dateDebut: string | null;
  signatureBailleur: string | null;
  appartement: {
    titre: string;
    adresse: string | null;
    ville: string | null;
    loyer: number;
    montantCharges: number | null;
  };
};

type Paiement = {
  mois: string;
  montant: number;
  loyerHC: number | null;
  chargesMois: number | null;
  statut: string;
  datePaiement: string | null;
};

type QuittanceData = {
  bail: BailInfo;
  paiements: Paiement[];
};

function moisToDate(mois: string): Date {
  const [y, m] = mois.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1);
}

function formatMoisLong(mois: string): string {
  return moisToDate(mois).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lastDayOfMonth(mois: string): number {
  const [y, m] = mois.split("-");
  return new Date(parseInt(y), parseInt(m), 0).getDate();
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Generate list of months between moisDebut and moisFin (inclusive)
function generateMoisList(moisDebut: string, moisFin: string): string[] {
  const list: string[] = [];
  const [sy, sm] = moisDebut.split("-").map(Number);
  const [ey, em] = moisFin.split("-").map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    list.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return list;
}

function QuittanceCard({ mois, bail, paiement }: {
  mois: string;
  bail: BailInfo;
  paiement: Paiement | null;
}) {
  const a = bail.appartement;
  const loyerHC = paiement?.loyerHC ?? a.loyer;
  const charges = paiement?.chargesMois ?? a.montantCharges ?? 0;
  const total = loyerHC + charges;
  const dateEmission = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const [yy, mm] = mois.split("-");
  const lastDay = lastDayOfMonth(mois);

  return (
    <div className="quittance-page">
      <div className="quittance-inner">

        {/* En-tête */}
        <div className="quittance-header">
          <h1>QUITTANCE DE LOYER</h1>
          <p className="quittance-subtitle">
            Mois de <strong>{capitalize(formatMoisLong(mois))}</strong>
          </p>
          <p className="quittance-periode">
            Période du 1<sup>er</sup> {capitalize(formatMoisLong(mois))} au {lastDay} {capitalize(moisToDate(mois).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}
          </p>
        </div>

        <hr className="quittance-hr" />

        {/* Parties */}
        <div className="quittance-parties">
          <div className="quittance-partie">
            <h2>BAILLEUR</h2>
            <p><strong>Gautier Lictevout</strong></p>
            <p>430 rue du Blocus</p>
            <p>59710 Mérignies</p>
          </div>
          <div className="quittance-partie">
            <h2>LOCATAIRE</h2>
            <p><strong>{bail.prenomNom ?? "—"}</strong></p>
            {bail.adresseLocataire && <p>{bail.adresseLocataire}</p>}
          </div>
        </div>

        {/* Logement */}
        <div className="quittance-section">
          <h2>LOGEMENT</h2>
          <p>
            {[a.adresse, a.ville].filter(Boolean).join(", ") || a.titre}
          </p>
        </div>

        {/* Détail loyer */}
        <div className="quittance-section">
          <h2>DÉTAIL DU RÈGLEMENT</h2>
          <table className="quittance-table">
            <tbody>
              <tr>
                <td>Loyer hors charges</td>
                <td className="quittance-amount">{loyerHC.toFixed(2).replace(".", ",")} €</td>
              </tr>
              {charges > 0 && (
                <tr>
                  <td>Charges locatives</td>
                  <td className="quittance-amount">{charges.toFixed(2).replace(".", ",")} €</td>
                </tr>
              )}
              <tr className="quittance-total-row">
                <td><strong>Total</strong></td>
                <td className="quittance-amount"><strong>{total.toFixed(2).replace(".", ",")} €</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attestation */}
        <div className="quittance-attestation">
          <p>
            Je soussigné, <strong>Gautier Lictevout</strong>, bailleur, certifie avoir reçu de{" "}
            <strong>{bail.prenomNom ?? "le locataire"}</strong>, locataire du logement sus-désigné,{" "}
            la somme de <strong>{total.toFixed(2).replace(".", ",")} €</strong> ({numberToWords(total)} euros),
            au titre du loyer et des charges du mois de{" "}
            <strong>{capitalize(formatMoisLong(mois))}</strong>, et lui en donne quittance,
            sous réserve de tous droits.
          </p>
        </div>

        {/* Signature */}
        <div className="quittance-signature-block">
          <p className="quittance-lieu-date">Fait à Mérignies, le {dateEmission}</p>
          <p className="quittance-signature-label">Signature du bailleur :</p>
          <div className="quittance-signature-img">
            <Image
              src="/images/signature-bailleur.png"
              alt="Signature bailleur"
              width={220}
              height={80}
              style={{ objectFit: "contain", mixBlendMode: "multiply" }}
              unoptimized
            />
          </div>
          <p className="quittance-nom-bailleur">Gautier Lictevout</p>
        </div>

      </div>
    </div>
  );
}

function numberToWords(n: number): string {
  // Simple French number-to-words for common rent amounts
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  const whole = Math.floor(n);
  const cents = Math.round((n - whole) * 100);

  function below100(num: number): string {
    if (num < 20) return units[num] || "";
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7) return "soixante-" + (u === 1 ? "et-onze" : units[10 + u]);
    if (t === 9) return "quatre-vingt-" + (u === 0 ? "s" : units[10 + u]);
    if (t === 8) return u === 0 ? "quatre-vingts" : "quatre-vingt-" + units[u];
    return tens[t] + (u === 1 && t !== 8 ? "-et-" : u > 0 ? "-" : "") + (u > 0 ? units[u] : "");
  }

  function below1000(num: number): string {
    if (num < 100) return below100(num);
    const h = Math.floor(num / 100);
    const r = num % 100;
    const hundredStr = (h === 1 ? "cent" : units[h] + " cent") + (r === 0 && h > 1 ? "s" : "");
    return hundredStr + (r > 0 ? " " + below100(r) : "");
  }

  let result = "";
  if (whole >= 1000) {
    const thousands = Math.floor(whole / 1000);
    result += (thousands === 1 ? "mille" : below1000(thousands) + " mille");
    const remainder = whole % 1000;
    if (remainder > 0) result += " " + below1000(remainder);
  } else {
    result = below1000(whole);
  }

  if (cents > 0) result += " et " + below100(cents) + " centimes";
  return result || "zéro";
}

function QuittanceContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const moisDebut = searchParams.get("moisDebut") ?? searchParams.get("mois") ?? "";
  const moisFin = searchParams.get("moisFin") ?? moisDebut;

  const [data, setData] = useState<QuittanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!moisDebut) { setLoading(false); return; }
    fetch(`/api/quittances/${token}?moisDebut=${moisDebut}&moisFin=${moisFin}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) setNotFound(true);
        else setData(d);
        setLoading(false);
      });
  }, [token, moisDebut, moisFin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Chargement…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Document introuvable.</p>
      </div>
    );
  }

  if (!moisDebut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Paramètre mois manquant.</p>
      </div>
    );
  }

  const moisList = generateMoisList(moisDebut, moisFin);
  const { bail, paiements } = data;

  return (
    <>
      {/* Bouton d'impression (masqué à l'impression) */}
      <div className="no-print print-toolbar">
        <button
          onClick={() => window.print()}
          className="print-btn"
        >
          🖨️ Imprimer / Télécharger en PDF
        </button>
        <p className="print-hint">
          Pour enregistrer en PDF : Fichier → Imprimer → Enregistrer en PDF
        </p>
      </div>

      {/* Quittances */}
      {moisList.map((mois) => {
        const paiement = paiements.find((p) => p.mois === mois) ?? null;
        return (
          <QuittanceCard
            key={mois}
            mois={mois}
            bail={bail}
            paiement={paiement}
          />
        );
      })}

      <style>{`
        @page {
          size: A4;
          margin: 20mm 20mm 20mm 20mm;
        }

        .print-toolbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 100;
        }

        .print-btn {
          background: #1a1a1a;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .print-btn:hover {
          background: #374151;
        }

        .print-hint {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        .quittance-page {
          padding-top: 72px; /* espace pour la toolbar */
          page-break-after: always;
        }

        .quittance-page:last-of-type {
          page-break-after: avoid;
        }

        .quittance-inner {
          max-width: 680px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #1a1a1a;
        }

        .quittance-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .quittance-header h1 {
          font-size: 22px;
          font-weight: bold;
          letter-spacing: 0.08em;
          margin: 0 0 6px;
          text-transform: uppercase;
        }

        .quittance-subtitle {
          font-size: 15px;
          margin: 0 0 4px;
        }

        .quittance-periode {
          font-size: 13px;
          color: #555;
          margin: 0;
        }

        .quittance-hr {
          border: none;
          border-top: 2px solid #1a1a1a;
          margin: 20px 0;
        }

        .quittance-parties {
          display: flex;
          gap: 40px;
          margin-bottom: 24px;
        }

        .quittance-partie {
          flex: 1;
        }

        .quittance-partie h2 {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #666;
          margin: 0 0 6px;
          font-family: Arial, sans-serif;
        }

        .quittance-partie p {
          margin: 2px 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .quittance-section {
          margin-bottom: 20px;
        }

        .quittance-section h2 {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #666;
          margin: 0 0 8px;
          font-family: Arial, sans-serif;
        }

        .quittance-section p {
          margin: 0;
          font-size: 14px;
        }

        .quittance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .quittance-table td {
          padding: 5px 0;
        }

        .quittance-amount {
          text-align: right;
        }

        .quittance-total-row td {
          border-top: 1px solid #999;
          padding-top: 8px;
          font-size: 15px;
        }

        .quittance-attestation {
          margin: 24px 0;
          padding: 16px;
          background: #f9f9f9;
          border-left: 3px solid #1a1a1a;
          font-size: 13px;
          line-height: 1.7;
        }

        .quittance-attestation p {
          margin: 0;
        }

        .quittance-signature-block {
          margin-top: 32px;
          text-align: right;
        }

        .quittance-lieu-date {
          font-size: 13px;
          margin: 0 0 16px;
          color: #444;
        }

        .quittance-signature-label {
          font-size: 12px;
          color: #666;
          margin: 0 0 6px;
        }

        .quittance-signature-img {
          display: inline-block;
          margin-bottom: 4px;
        }

        .quittance-signature-blank {
          display: inline-block;
          width: 200px;
          height: 60px;
          border-bottom: 1px solid #999;
          margin-bottom: 4px;
        }

        .quittance-nom-bailleur {
          font-size: 13px;
          font-weight: bold;
          margin: 4px 0 0;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          .quittance-page {
            padding-top: 0;
          }

          .quittance-inner {
            padding: 0;
            max-width: 100%;
          }

          body {
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}

export default function QuittancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Chargement…
      </div>
    }>
      <QuittanceContent />
    </Suspense>
  );
}
