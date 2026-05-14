"use client";

import { useEffect, useRef, useState, use } from "react";
import Image from "next/image";
import SignatureCanvas from "@/components/SignatureCanvas";

type Ligne = { id: string; objet: string; nbEntree: string; etatEntree: string; nbSortie: string; etatSortie: string };
type Edl = {
  id: number; token: string; type: "entree" | "sortie"; date: string | null; status: string;
  lignes: string; photos: string;
  remarqueCuisine: string | null; remarqueSDB: string | null;
  remarquePiece: string | null; remarqueGeneral: string | null;
  locataireNom: string | null; locataireEmail: string | null;
  signatureBailleur: string | null; signatureBailleurAt: string | null;
  signatureLocataire: string | null; signatureLocataireAt: string | null;
  inventaire: { appartement: { titre: string; adresse: string | null; ville: string | null } };
};

export default function EdlTenantPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [edl, setEdl] = useState<Edl | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);

  // OTP flow
  const [step, setStep] = useState<"view" | "otp_send" | "otp_verify" | "signing" | "done">("view");
  const [sessionToken, setSessionToken] = useState("");
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/edl/${token}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((data) => {
        if (!data) return;
        setEdl(data);
        setLignes(JSON.parse(data.lignes || "[]"));
        setPhotos(JSON.parse(data.photos || "[]"));
        if (data.status === "signed_both") setStep("done");
      });
  }, [token]);

  async function sendOtp() {
    setSendingOtp(true);
    setOtpError("");
    const res = await fetch(`/api/edl/${token}/otp`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setOtpError(data.error ?? "Erreur"); setSendingOtp(false); return; }
    setSessionToken(data.sessionToken);
    setStep("otp_verify");
    setSendingOtp(false);
  }

  async function handleSign(sigUrl: string) {
    setSignatureUrl(sigUrl);
    setStep("signing");
    const res = await fetch(`/api/edl/${token}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, code, signatureUrl: sigUrl }),
    });
    const data = await res.json();
    if (!res.ok) { setOtpError(data.error ?? "Erreur"); setStep("otp_verify"); return; }
    setEdl(data);
    setStep("done");
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      <p>État des lieux introuvable.</p>
    </div>
  );

  if (!edl) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>
  );

  const isEntree = edl.type === "entree";
  const typeLabel = isEntree ? "d'entrée" : "de sortie";
  const appart = edl.inventaire.appartement;
  const canSign = edl.status === "signed_bailleur" && step !== "done";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-lg font-semibold text-gray-900">
            État des lieux {typeLabel}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {appart.titre} · {[appart.adresse, appart.ville].filter(Boolean).join(", ")} · {edl.date}
          </p>
          {edl.locataireNom && <p className="text-sm text-gray-500">Locataire : {edl.locataireNom}</p>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Tableau */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="font-semibold text-gray-900">Inventaire</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Objet</th>
                  <th className="text-center px-2 py-2 font-medium text-gray-600 w-12">Nb</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">État {isEntree ? "entrée" : "sortie"}</th>
                  {!isEntree && <th className="text-left px-2 py-2 font-medium text-gray-600">État entrée</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.map((l) => {
                  const nb = isEntree ? l.nbEntree : (l.nbSortie || l.nbEntree);
                  const etat = isEntree ? l.etatEntree : (l.etatSortie || "—");
                  const different = !isEntree && l.etatSortie && l.etatSortie !== l.etatEntree;
                  return (
                    <tr key={l.id} className={different ? "bg-orange-50" : ""}>
                      <td className="px-4 py-2 font-medium text-gray-900">{l.objet}</td>
                      <td className="px-2 py-2 text-center text-gray-600">{nb}</td>
                      <td className={`px-2 py-2 ${different ? "text-orange-700 font-medium" : "text-gray-700"}`}>{etat}</td>
                      {!isEntree && <td className="px-2 py-2 text-gray-400 text-xs">{l.etatEntree}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Remarques */}
        {(edl.remarqueCuisine || edl.remarqueSDB || edl.remarquePiece || edl.remarqueGeneral) && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Remarques</h2>
            {[
              { label: "Cuisine", val: edl.remarqueCuisine },
              { label: "Salle de bain / WC", val: edl.remarqueSDB },
              { label: "Pièce principale", val: edl.remarquePiece },
              { label: "Général", val: edl.remarqueGeneral },
            ].filter((r) => r.val).map((r) => (
              <div key={r.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{r.label}</p>
                <p className="text-sm text-gray-700 mt-0.5">{r.val}</p>
              </div>
            ))}
          </section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Photos ({photos.length})</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image src={url} alt="" fill sizes="160px" className="object-cover" unoptimized={url.startsWith("/uploads/")} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Signatures */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Signatures</h2>

          {edl.signatureBailleur && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Bailleur — {edl.signatureBailleurAt ? new Date(edl.signatureBailleurAt).toLocaleDateString("fr-FR") : ""}</p>
              <Image src={edl.signatureBailleur} alt="Signature bailleur" width={200} height={70} className="border rounded" unoptimized />
            </div>
          )}

          {step === "done" && edl.signatureLocataire && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Locataire — {edl.signatureLocataireAt ? new Date(edl.signatureLocataireAt).toLocaleDateString("fr-FR") : ""}</p>
              <Image src={edl.signatureLocataire} alt="Signature locataire" width={200} height={70} className="border rounded" unoptimized />
            </div>
          )}

          {step === "done" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold">✅ État des lieux signé par les deux parties</p>
              <p className="text-sm text-green-600 mt-1">Un récapitulatif vous a été envoyé par email.</p>
            </div>
          )}

          {/* Pas encore signé par bailleur */}
          {edl.status === "draft" && (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400">
              En attente de la signature du bailleur.
            </div>
          )}

          {/* Prêt à signer côté locataire */}
          {canSign && step === "view" && (
            <button
              onClick={() => setStep("otp_send")}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-700 transition-colors"
            >
              ✍️ Signer l'état des lieux
            </button>
          )}

          {canSign && step === "otp_send" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Un code de vérification sera envoyé à <strong>{edl.locataireEmail}</strong>.
              </p>
              {otpError && <p className="text-sm text-red-600">{otpError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={sendOtp}
                  disabled={sendingOtp}
                  className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
                >
                  {sendingOtp ? "Envoi…" : "📧 Recevoir le code"}
                </button>
                <button onClick={() => setStep("view")} className="border border-gray-200 px-4 py-2.5 rounded-lg text-sm text-gray-600">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {canSign && step === "otp_verify" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Code reçu par email :</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="_ _ _ _ _ _"
              />
              {otpError && <p className="text-sm text-red-600">{otpError}</p>}
              <button
                onClick={() => code.length === 6 ? setStep("signing") : null}
                disabled={code.length < 6}
                className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
              >
                Valider et signer
              </button>
              <button onClick={sendOtp} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center">
                Renvoyer le code
              </button>
            </div>
          )}

          {canSign && step === "signing" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Apposez votre signature :</p>
              {otpError && <p className="text-sm text-red-600">{otpError}</p>}
              <SignatureCanvas
                onSign={handleSign}
                onCancel={() => setStep("otp_verify")}
                loading={verifying}
              />
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
