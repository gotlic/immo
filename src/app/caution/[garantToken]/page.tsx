"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignaturePad, { SignaturePadHandle } from "@/components/SignaturePad";
import CautionDocument, { CautionDocumentData } from "@/components/CautionDocument";
import OtpVerification from "@/components/OtpVerification";

type BailInfo = {
  status: string;
  bailToken: string | null;
  garantCivilite: string | null;
  garantPrenomNom: string | null;
  garantDateNaissance: string | null;
  garantAdresse: string | null;
  prenomNom: string | null;
  adresseLocataire: string | null;
  dateDebut: string | null;
  irlTrimestre: string | null;
  irlValeur: string | null;
  appartement: {
    titre: string;
    adresse: string | null;
    ville: string | null;
    surface: number;
    loyer: number;
    montantCharges: number | null;
  };
};

export default function CautionPage() {
  const { garantToken } = useParams<{ garantToken: string }>();
  const [bail, setBail] = useState<BailInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [step, setStep] = useState<"read" | "done">("read");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sigRef = useRef<SignaturePadHandle>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [faitA, setFaitA] = useState("");
  const [otpSessionToken, setOtpSessionToken] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/caution/${garantToken}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setApiError(j.error ?? "Erreur");
        } else {
          setBail(await r.json());
        }
        setLoading(false);
      });
  }, [garantToken]);

  async function handleSign() {
    if (!faitA.trim()) {
      setError("Veuillez renseigner la ville (\"Fait à\") avant de valider.");
      return;
    }
    if (!signatureDataUrl) {
      setError("Veuillez apposer votre signature avant de valider.");
      return;
    }
    if (!otpSessionToken) {
      setError("Veuillez vérifier votre identité par email avant de valider.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/caution/${garantToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signatureDataUrl, faitA, otpSessionToken }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Erreur lors de l'enregistrement");
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Chargement…
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium text-gray-900">Lien invalide ou déjà utilisé</p>
          <p className="text-sm mt-1 text-gray-500">{apiError}</p>
          <p className="text-sm mt-2 text-gray-400">
            Si vous avez déjà signé l'acte, le locataire a été notifié par email.
          </p>
        </div>
      </div>
    );
  }

  if (!bail) return null;

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acte signé avec succès</h1>
          <p className="text-gray-600 text-sm">
            Votre acte de cautionnement a été enregistré. Le locataire a reçu un email
            l'invitant à lire et signer le bail. L'acte sera joint en annexe du contrat.
          </p>
        </div>
      </div>
    );
  }

  const docData: CautionDocumentData = {
    garantCivilite: bail.garantCivilite ?? "M.",
    garantPrenomNom: bail.garantPrenomNom ?? "",
    garantDateNaissance: bail.garantDateNaissance ?? "",
    garantAdresse: bail.garantAdresse ?? "",
    adresse: bail.appartement.adresse,
    ville: bail.appartement.ville,
    titre: bail.appartement.titre,
    surface: bail.appartement.surface,
    dateDebut: bail.dateDebut,
    irlTrimestre: bail.irlTrimestre,
    irlValeur: bail.irlValeur,
    prenomNom: bail.prenomNom ?? "",
    adresseLocataire: bail.adresseLocataire ?? "",
    loyer: bail.appartement.loyer,
    montantCharges: bail.appartement.montantCharges,
  };

  const signatureSlot = (
    <div className="space-y-1">
      <SignaturePad ref={sigRef} onChange={setSignatureDataUrl} />
    </div>
  );

  const canValidate = faitA.trim() && signatureDataUrl && otpSessionToken;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bandeau */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Acte de cautionnement solidaire</p>
            <p className="text-sm font-medium text-gray-800">
              Lisez attentivement l'acte ci-dessous, puis signez en bas de page
            </p>
          </div>
          {bail.bailToken && (
            <a
              href={`/bail/${bail.bailToken}/view?from=garant`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Voir le bail
            </a>
          )}
        </div>
      </div>

      {/* Bannière info */}
      <div className="max-w-4xl mx-auto px-4 pt-6 print:hidden">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Important :</strong> Vous êtes invité(e) à vous porter caution solidaire pour le bail
          de <strong>{bail.prenomNom}</strong>. Lisez attentivement cet acte avant de signer.
          En signant, vous vous engagez à garantir le paiement des loyers et charges
          en cas de défaillance du locataire.
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 print:p-0">
        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-8 sm:p-12 print:shadow-none print:border-none">
          <CautionDocument
          data={docData}
          signatureSlot={signatureSlot}
          faitA={faitA}
          onFaitAChange={setFaitA}
        />
        </div>
      </div>

      {/* Bouton validation + OTP */}
      <div className="print:hidden sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          {/* OTP — affiché une fois signature + "Fait à" remplis */}
          {faitA.trim() && signatureDataUrl && !otpSessionToken && (
            <OtpVerification
              documentType="caution"
              token={garantToken}
              signerRole="garant"
              onVerified={(st) => setOtpSessionToken(st)}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleSign}
            disabled={saving || !canValidate}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {saving
              ? "Enregistrement…"
              : !faitA.trim()
              ? "Renseignez la ville (\"Fait à\") dans le document ci-dessus"
              : !signatureDataUrl
              ? "✍️ Signez l'acte dans le document ci-dessus"
              : !otpSessionToken
              ? "🔐 Vérifiez votre identité ci-dessus"
              : "✅ Valider ma signature et envoyer l'acte"}
          </button>
          <p className="text-xs text-center text-gray-400">
            Signature électronique simple — règlement eIDAS n° 910/2014
          </p>
        </div>
      </div>
    </div>
  );
}
