"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SignaturePad, { SignaturePadHandle } from "@/components/SignaturePad";
import BailDocument, { BailDocumentData } from "@/components/BailDocument";

type Inventaire = {
  dateEntree: string | null; lignes: string;
  remarqueCuisine: string | null; remarqueSDB: string | null;
  remarquePiece: string | null; remarqueGeneral: string | null;
};

type Appartement = {
  id: number; titre: string; adresse: string | null; ville: string | null;
  etage: number | null; surface: number; nbPieces: number;
  loyer: number; montantCharges: number | null; detailCharges: string | null;
  dpePdf: string | null;
  typeChauffage: string | null; courExtVegetalisee: boolean;
  loyerPrecedentLocataire: number | null; coutEnergMensuel: number | null;
  inventaire: Inventaire | null;
};

type Bail = {
  id: number; token: string; status: string;
  dateDebut: string | null; irlTrimestre: string | null; irlValeur: string | null;
  loyerReference: string | null; loyerReferenceMaj: string | null;
  prenomNom: string | null; dateNaissance: string | null;
  adresseLocataire: string | null; tel: string | null; mailLocataire: string | null;
  garantCivilite: string | null; garantPrenomNom: string | null;
  garantDateNaissance: string | null; garantAdresse: string | null;
  garantEmail: string | null; garantToken: string | null; garantLieu: string | null;
  signatureCaution: string | null; signatureCautionAt: string | null;
  signatureLocataire: string | null; signatureLocataireAt: string | null; ipLocataire: string | null;
  signatureBailleur: string | null; signatureBailleurAt: string | null;
  createdAt: string;
  appartement: Appartement;
};

export default function BailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [bail, setBail] = useState<Bail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigError, setSigError] = useState("");
  const sigRef = useRef<SignaturePadHandle>(null);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [notifSending, setNotifSending] = useState(false);
  const [notifDone, setNotifDone] = useState<"sent" | "skipped" | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/baux/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { setBail(data); setLoading(false); });
    }
  }, [status, id]);

  async function handleSignBailleur() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setSigError("Veuillez apposer votre signature avant de valider."); return;
    }
    setSigSaving(true); setSigError("");
    const signature = sigRef.current.toDataURL();
    const res = await fetch(`/api/baux/${id}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBail((prev) => prev ? { ...prev, ...updated } : prev);
      setShowNotifPopup(true); // afficher popup de confirmation email
    } else {
      setSigError("Erreur lors de l'enregistrement de la signature.");
    }
    setSigSaving(false);
  }

  async function handleSendNotif() {
    setNotifSending(true);
    try {
      const res = await fetch(`/api/baux/${id}/notify-tenant`, { method: "POST" });
      if (!res.ok) throw new Error();
      setNotifDone("sent");
    } catch {
      setNotifDone("sent"); // on ferme quand même
    }
    setNotifSending(false);
    setShowNotifPopup(false);
  }

  if (status === "loading" || loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>
  );
  if (!session || !bail) return null;

  const a = bail.appartement;
  const tenantUrl = typeof window !== "undefined" ? `${window.location.origin}/bail/${bail.token}` : "";
  const cautionUrl = bail.garantToken && typeof window !== "undefined"
    ? `${window.location.origin}/caution/${bail.garantToken}` : "";

  const cautionData = bail.signatureCaution
    ? {
        garantCivilite: bail.garantCivilite ?? "M.",
        garantPrenomNom: bail.garantPrenomNom ?? "",
        garantDateNaissance: bail.garantDateNaissance ?? "",
        garantAdresse: bail.garantAdresse ?? "",
        adresse: a.adresse, ville: a.ville, titre: a.titre, surface: a.surface,
        dateDebut: bail.dateDebut, irlTrimestre: bail.irlTrimestre, irlValeur: bail.irlValeur,
        prenomNom: bail.prenomNom ?? "", adresseLocataire: bail.adresseLocataire ?? "",
        loyer: a.loyer, montantCharges: a.montantCharges,
        signatureLocataireAt: bail.signatureLocataireAt,
      }
    : null;

  const docData: BailDocumentData = {
    adresse: a.adresse, ville: a.ville, etage: a.etage,
    surface: a.surface, nbPieces: a.nbPieces,
    loyer: a.loyer, montantCharges: a.montantCharges, detailCharges: a.detailCharges,
    dateDebut: bail.dateDebut, irlTrimestre: bail.irlTrimestre, irlValeur: bail.irlValeur,
    loyerReference: bail.loyerReference, loyerReferenceMaj: bail.loyerReferenceMaj,
    prenomNom: bail.prenomNom, dateNaissance: bail.dateNaissance,
    adresseLocataire: bail.adresseLocataire, tel: bail.tel, mailLocataire: bail.mailLocataire,
    garantCivilite: bail.garantCivilite, garantPrenomNom: bail.garantPrenomNom,
    garantDateNaissance: bail.garantDateNaissance, garantAdresse: bail.garantAdresse,
    typeChauffage: a.typeChauffage, courExtVegetalisee: a.courExtVegetalisee,
    loyerPrecedentLocataire: a.loyerPrecedentLocataire, coutEnergMensuel: a.coutEnergMensuel,
    dpePdf: a.dpePdf,
    inventaire: a.inventaire,
    cautionData,
    garantLieu: bail.garantLieu,
    signatureCaution: bail.signatureCaution,
  };

  // Slot signature bailleur : pad si pas encore signé
  const bailleurSlot = (
    <div className="print:hidden space-y-2">
      <SignaturePad ref={sigRef} />
      {sigError && <p className="text-xs text-red-500">{sigError}</p>}
      <button
        onClick={handleSignBailleur}
        disabled={sigSaving}
        className="bg-gray-900 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {sigSaving ? "Enregistrement…" : "✍️ Signer en tant que bailleur"}
      </button>
      <p className="text-xs text-gray-400">Lu et approuvé</p>
    </div>
  );

  // Slot signature locataire : message d'attente selon statut
  const locataireSlot = (
    <div>
      <div className="border-b border-dashed border-gray-300 h-16 mt-2" />
      {bail.status === "info_submitted" ? (
        <p className="text-xs text-orange-600 mt-1">📨 En attente de la signature de l'acte de cautionnement par {bail.garantPrenomNom}</p>
      ) : bail.status === "caution_signed" ? (
        <p className="text-xs text-blue-600 mt-1">✅ Caution signée — en attente de la signature du locataire</p>
      ) : (
        <p className="text-xs text-amber-600 mt-1">⏳ En attente de la signature du locataire</p>
      )}
    </div>
  );

  return (
    <>
      {/* ── Popup confirmation email locataire ── */}
      {showNotifPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-md w-full space-y-4">
            <div className="text-center text-4xl">✅</div>
            <h2 className="text-lg font-bold text-gray-900 text-center">Bail signé !</h2>
            <p className="text-sm text-gray-600 text-center">
              Envoyer le bail complet (avec annexes) par email à{" "}
              <strong>{bail.prenomNom}</strong>
              {bail.mailLocataire ? <> ({bail.mailLocataire})</> : ""} ?
            </p>
            <p className="text-xs text-gray-400 text-center">
              Le locataire recevra un lien pour consulter et télécharger le document en PDF.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowNotifPopup(false); setNotifDone("skipped"); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Non merci
              </button>
              <button
                onClick={handleSendNotif}
                disabled={notifSending}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {notifSending ? "Envoi…" : "Oui, envoyer 📧"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bannière confirmation envoi */}
      {notifDone === "sent" && (
        <div className="print:hidden bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-800 text-center">
          ✅ Email envoyé à {bail.mailLocataire} avec le lien de téléchargement du bail.
        </div>
      )}

      {/* Barre d'actions — cachée à l'impression */}
      <div className="print:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">← Retour</Link>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="text-sm font-medium text-gray-700 truncate hidden sm:inline">Bail — {a.titre}</span>
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            {bail.status === "pending" && (
              <div className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">⏳ En attente du locataire</div>
            )}
            {bail.status === "info_submitted" && (
              <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">📨 En attente signature garant</div>
            )}
            {bail.status === "caution_signed" && (
              <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">✅ Caution signée — en attente locataire</div>
            )}
            {bail.status === "signed_tenant" && (
              <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">✍️ Locataire signé — à contresigner</div>
            )}
            {bail.status === "signed_both" && (
              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Signé des deux parties</div>
            )}
            <button
              onClick={() => window.print()}
              className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              🖨 Imprimer / PDF
            </button>
          </div>
        </div>
        {bail.status === "pending" && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 flex flex-wrap items-center gap-2">
              <span className="font-medium">Lien locataire :</span>
              <span className="font-mono break-all">{tenantUrl}</span>
              <button
                onClick={() => navigator.clipboard.writeText(tenantUrl)}
                className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-500 flex-shrink-0"
              >
                Copier
              </button>
            </div>
          </div>
        )}
        {bail.status === "info_submitted" && cautionUrl && (
          <div className="max-w-4xl mx-auto px-4 pb-3 space-y-2">
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700 flex flex-wrap items-center gap-2">
              <span className="font-medium">Lien caution ({bail.garantPrenomNom}) :</span>
              <span className="font-mono break-all">{cautionUrl}</span>
              <button
                onClick={() => navigator.clipboard.writeText(cautionUrl)}
                className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs hover:bg-orange-500 flex-shrink-0"
              >
                Copier
              </button>
            </div>
            {bail.garantEmail && (
              <p className="text-xs text-gray-500 px-1">Email envoyé à : {bail.garantEmail}</p>
            )}
          </div>
        )}
        {bail.status === "caution_signed" && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700">
              ✅ Acte de cautionnement signé par {bail.garantPrenomNom}
              {bail.signatureCautionAt && ` le ${new Date(bail.signatureCautionAt).toLocaleDateString("fr-FR")}`}
              {" — "}Le locataire peut maintenant signer le bail via son lien.
            </div>
          </div>
        )}
      </div>

      {/* Document bail */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 print:p-0 print:max-w-none">
        <BailDocument
          data={docData}
          bailleurSignatureUrl={bail.signatureBailleur}
          bailleurSignatureAt={bail.signatureBailleurAt}
          bailleurSignatureSlot={!bail.signatureBailleur ? bailleurSlot : undefined}
          locataireSignatureUrl={bail.signatureLocataire}
          locataireSignatureAt={bail.signatureLocataireAt}
          locataireIp={bail.ipLocataire}
          locataireSignatureSlot={!bail.signatureLocataire ? locataireSlot : undefined}
        />
      </div>
    </>
  );
}
