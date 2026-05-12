"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignaturePad, { SignaturePadHandle } from "@/components/SignaturePad";
import BailDocument, { BailDocumentData } from "@/components/BailDocument";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { isValidEmail, isValidPhoneFR } from "@/lib/validators";

type BailInfo = {
  status: string;
  dateDebut: string | null;
  irlTrimestre: string | null;
  irlValeur: string | null;
  loyerReference: string | null;
  loyerReferenceMaj: string | null;
  prenomNom: string | null;
  dateNaissance: string | null;
  villeNaissance: string | null;
  departementNaissance: string | null;
  adresseLocataire: string | null;
  tel: string | null;
  mailLocataire: string | null;
  garantCivilite: string | null;
  garantPrenomNom: string | null;
  garantDateNaissance: string | null;
  garantAdresse: string | null;
  garantEmail: string | null;
  garantLieu: string | null;
  signatureCaution: string | null;
  signatureCautionAt: string | null;
  signatureLocataire: string | null;
  signatureLocataireAt: string | null;
  ipLocataire: string | null;
  signatureBailleur: string | null;
  signatureBailleurAt: string | null;
  appartement: {
    titre: string; adresse: string | null; ville: string | null;
    etage: number | null; surface: number; nbPieces: number;
    loyer: number; montantCharges: number | null; detailCharges: string | null;
    dpePdf: string | null; typeBail: string;
    typeChauffage: string | null; courExtVegetalisee: boolean;
    loyerPrecedentLocataire: number | null; coutEnergMensuel: number | null;
    inventaire: {
      dateEntree: string | null; lignes: string;
      remarqueCuisine: string | null; remarqueSDB: string | null;
      remarquePiece: string | null; remarqueGeneral: string | null;
    } | null;
  };
};

type Step = "form" | "popup_caution" | "waiting_caution" | "preview" | "done";

export default function TenantFormPage() {
  const { token } = useParams<{ token: string }>();
  const [bail, setBail] = useState<BailInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* Locataire */
  const [prenomNom, setPrenomNom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [villeNaissance, setVilleNaissance] = useState("");
  const [departementNaissance, setDepartementNaissance] = useState("");
  const [adresseLocataire, setAdresseLocataire] = useState("");
  const [tel, setTel] = useState("");
  const [mailLocataire, setMailLocataire] = useState("");

  /* Garant */
  const [garantCivilite, setGarantCivilite] = useState("Mme");
  const [garantPrenomNom, setGarantPrenomNom] = useState("");
  const [garantDateNaissance, setGarantDateNaissance] = useState("");
  const [garantAdresse, setGarantAdresse] = useState("");
  const [garantEmail, setGarantEmail] = useState("");

  /* Signature */
  const sigRef = useRef<SignaturePadHandle>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bail/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setBail(data);
          // Re-hydrater les champs locataire/garant depuis la BDD
          if (data.prenomNom)             setPrenomNom(data.prenomNom);
          if (data.dateNaissance)         setDateNaissance(data.dateNaissance);
          if (data.villeNaissance)        setVilleNaissance(data.villeNaissance);
          if (data.departementNaissance)  setDepartementNaissance(data.departementNaissance);
          if (data.adresseLocataire)      setAdresseLocataire(data.adresseLocataire);
          if (data.tel)                 setTel(data.tel);
          if (data.mailLocataire)       setMailLocataire(data.mailLocataire);
          if (data.garantCivilite)      setGarantCivilite(data.garantCivilite);
          if (data.garantPrenomNom)     setGarantPrenomNom(data.garantPrenomNom);
          if (data.garantDateNaissance) setGarantDateNaissance(data.garantDateNaissance);
          if (data.garantAdresse)       setGarantAdresse(data.garantAdresse);
          if (data.garantEmail)         setGarantEmail(data.garantEmail);
          // Naviguer à l'étape correcte selon le statut
          if (data.status === "info_submitted") setStep("waiting_caution");
          if (data.status === "caution_signed") setStep("preview");
        }
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (step === "preview") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* ── Étape 1 : soumettre infos locataire + garant ── */
  async function handleSubmitInfo() {
    if (!prenomNom || !dateNaissance || !villeNaissance || !departementNaissance
      || !adresseLocataire || !tel || !mailLocataire
      || !garantPrenomNom || !garantDateNaissance || !garantAdresse || !garantEmail) {
      setError("Veuillez remplir tous les champs obligatoires."); return;
    }
    if (!isValidEmail(mailLocataire)) { setError("Email locataire invalide."); return; }
    if (!isValidPhoneFR(tel)) { setError("Numéro de téléphone invalide."); return; }
    if (!isValidEmail(garantEmail)) { setError("Email du garant invalide."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/bail/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_info",
          prenomNom, dateNaissance, villeNaissance, departementNaissance,
          adresseLocataire, tel, mailLocataire,
          garantCivilite, garantPrenomNom, garantDateNaissance, garantAdresse, garantEmail,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur lors de l'envoi");
      }
      // Rafraîchir les infos du bail
      const updated = await fetch(`/api/bail/${token}`).then((r) => r.json());
      setBail(updated);
      setStep("popup_caution");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  /* ── Étape 3 : signer le bail ── */
  async function handleSignBail() {
    if (!signatureDataUrl) { setError("Veuillez apposer votre signature avant de valider."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/bail/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign", signature: signatureDataUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur lors de l'envoi");
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement…</div>;

  if (!bail) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-500">
        <p className="text-lg font-medium">Lien invalide ou expiré.</p>
        <p className="text-sm mt-1">Merci de contacter le propriétaire.</p>
      </div>
    </div>
  );

  /* Bail signé des deux côtés → vue complète téléchargeable */
  if (bail.status === "signed_both") {
    const a = bail.appartement;
    const cautionData = bail.signatureCaution ? {
      garantCivilite: bail.garantCivilite ?? "M.",
      garantPrenomNom: bail.garantPrenomNom ?? "",
      garantDateNaissance: bail.garantDateNaissance ?? "",
      garantAdresse: bail.garantAdresse ?? "",
      adresse: a.adresse, ville: a.ville, titre: a.titre, surface: a.surface,
      dateDebut: bail.dateDebut, irlTrimestre: bail.irlTrimestre, irlValeur: bail.irlValeur,
      prenomNom: bail.prenomNom ?? "", adresseLocataire: bail.adresseLocataire ?? "",
      loyer: a.loyer, montantCharges: a.montantCharges,
      signatureLocataireAt: bail.signatureLocataireAt,
    } : null;

    const fullDocData: BailDocumentData = {
      adresse: a.adresse, ville: a.ville, etage: a.etage,
      surface: a.surface, nbPieces: a.nbPieces,
      loyer: a.loyer, montantCharges: a.montantCharges, detailCharges: a.detailCharges,
      dateDebut: bail.dateDebut, irlTrimestre: bail.irlTrimestre, irlValeur: bail.irlValeur,
      loyerReference: bail.loyerReference, loyerReferenceMaj: bail.loyerReferenceMaj,
      prenomNom: bail.prenomNom, dateNaissance: bail.dateNaissance,
      villeNaissance: bail.villeNaissance, departementNaissance: bail.departementNaissance,
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

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Bandeau fixe */}
        <div className="print:hidden sticky top-0 z-20 bg-white border-b border-green-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">✅ Bail signé par les deux parties</p>
              <p className="text-sm text-gray-600">Imprimez ou enregistrez en PDF via votre navigateur</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              🖨 Télécharger en PDF
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 print:p-0">
          <BailDocument
            typeBail={bail.appartement.typeBail}
            data={fullDocData}
            locataireSignatureUrl={bail.signatureLocataire}
            locataireSignatureAt={bail.signatureLocataireAt}
            locataireIp={bail.ipLocataire}
            bailleurSignatureUrl={bail.signatureBailleur}
            bailleurSignatureAt={bail.signatureBailleurAt}
          />
        </div>
      </div>
    );
  }

  /* Bail signé locataire, en attente bailleur */
  if (bail.status === "signed_tenant") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-lg font-medium text-gray-900">Bail signé, en attente du propriétaire</p>
        <p className="text-sm mt-1 text-gray-500">Votre signature a bien été enregistrée. Le propriétaire va contresigner et vous recevrez un email dès que le document sera finalisé.</p>
      </div>
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Bail signé électroniquement</h1>
        <p className="text-gray-600 text-sm">
          Votre signature a bien été enregistrée. Le propriétaire va contresigner le bail et vous en adressera un exemplaire.
        </p>
      </div>
    </div>
  );

  const { appartement: a } = bail;

  /* ── POPUP : garant va recevoir email ── */
  if (step === "popup_caution") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">📨</div>
        <h2 className="text-xl font-bold text-gray-900">Email envoyé à votre garant</h2>
        <p className="text-gray-600 text-sm">
          <strong>{garantPrenomNom}</strong> va recevoir un email à{" "}
          <strong>{garantEmail}</strong> pour signer l'acte de cautionnement solidaire.
        </p>
        <p className="text-gray-500 text-sm">
          Dès sa signature, vous recevrez un email à <strong>{mailLocataire}</strong> vous invitant
          à lire le contrat et à apposer votre signature électronique.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          L'acte de cautionnement signé sera intégré en annexe du bail.
        </div>
        <button
          onClick={() => setStep("waiting_caution")}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
        >
          Compris →
        </button>
      </div>
    </div>
  );

  /* ── ÉCRAN D'ATTENTE : caution pas encore signée ── */
  if (step === "waiting_caution" || bail.status === "info_submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h2 className="text-xl font-bold text-gray-900">En attente de votre garant</h2>
          <p className="text-gray-600 text-sm">
            Un email a été envoyé à <strong>{bail.garantPrenomNom}</strong> pour signer
            l'acte de cautionnement.
          </p>
          <p className="text-gray-500 text-sm">
            Vous recevrez un email dès que votre garant aura signé, vous permettant
            de lire et signer le bail.
          </p>
          <button
            onClick={async () => {
              const updated = await fetch(`/api/bail/${token}`).then((r) => r.json());
              setBail(updated);
              if (updated.status === "caution_signed") setStep("preview");
            }}
            className="text-sm text-gray-400 underline hover:text-gray-600"
          >
            Vérifier si la caution a été signée
          </button>
        </div>
      </div>
    );
  }

  /* ── FORMULAIRE ── */
  if (step === "form") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Étape 1 / 2 — Vos informations</p>
            <h1 className="text-lg font-semibold text-gray-900">Contrat de location</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {a.titre}{a.adresse ? ` · ${a.adresse}` : ""}{a.ville ? `, ${a.ville}` : ""}
            </p>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
            Renseignez vos informations et celles de votre garant. L'acte de cautionnement lui sera
            envoyé par email pour signature, puis vous pourrez{" "}
            <strong>lire et signer le bail</strong>.
          </div>

          <div className="space-y-6">
            {/* Locataire */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Vos informations</h2>
              <div>
                <label className="label">Prénom et Nom *</label>
                <input type="text" value={prenomNom} onChange={(e) => setPrenomNom(e.target.value)} className="input" placeholder="Marie Dupont" />
              </div>
              <div>
                <label className="label">Date de naissance *</label>
                <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ville de naissance *</label>
                  <input type="text" value={villeNaissance} onChange={(e) => setVilleNaissance(e.target.value)} className="input" placeholder="Lille" />
                </div>
                <div>
                  <label className="label">Département de naissance *</label>
                  <input type="text" value={departementNaissance} onChange={(e) => setDepartementNaissance(e.target.value)} className="input" placeholder="59" maxLength={3} />
                </div>
              </div>
              <div>
                <label className="label">Adresse actuelle *</label>
                <AddressAutocomplete value={adresseLocataire} onChange={setAdresseLocataire} placeholder="12 rue des Lilas, 75001 Paris" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Téléphone *</label>
                  <input
                    type="tel" value={tel}
                    onChange={(e) => setTel(e.target.value)}
                    className={`input ${tel && !isValidPhoneFR(tel) ? "border-red-400" : tel && isValidPhoneFR(tel) ? "border-green-400" : ""}`}
                    placeholder="06 12 34 56 78"
                  />
                  {tel && !isValidPhoneFR(tel) && <p className="text-xs text-red-500 mt-1">Format invalide — ex. 06 12 34 56 78</p>}
                  {tel && isValidPhoneFR(tel) && <p className="text-xs text-green-600 mt-1">✅ Format valide</p>}
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    type="email" value={mailLocataire}
                    onChange={(e) => setMailLocataire(e.target.value)}
                    className={`input ${mailLocataire && !isValidEmail(mailLocataire) ? "border-red-400" : mailLocataire && isValidEmail(mailLocataire) ? "border-green-400" : ""}`}
                    placeholder="marie@email.fr"
                  />
                  {mailLocataire && !isValidEmail(mailLocataire) && <p className="text-xs text-red-500 mt-1">Format invalide</p>}
                  {mailLocataire && isValidEmail(mailLocataire) && <p className="text-xs text-green-600 mt-1">✅ Format valide</p>}
                </div>
              </div>
            </section>

            {/* Garant */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Votre garant</h2>
                <p className="text-xs text-gray-400 mt-0.5">La personne qui se porte caution solidaire pour votre bail.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Civilité *</label>
                  <select value={garantCivilite} onChange={(e) => setGarantCivilite(e.target.value)} className="input">
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Prénom et Nom *</label>
                  <input type="text" value={garantPrenomNom} onChange={(e) => setGarantPrenomNom(e.target.value)} className="input" placeholder="Jean Dupont" />
                </div>
              </div>
              <div>
                <label className="label">Date de naissance du garant *</label>
                <input type="date" value={garantDateNaissance} onChange={(e) => setGarantDateNaissance(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Adresse du garant *</label>
                <AddressAutocomplete value={garantAdresse} onChange={setGarantAdresse} placeholder="24 avenue de la République, 59000 Lille" required />
              </div>
              <div>
                <label className="label">Email du garant *</label>
                <input
                  type="email" value={garantEmail}
                  onChange={(e) => setGarantEmail(e.target.value)}
                  className={`input ${garantEmail && !isValidEmail(garantEmail) ? "border-red-400" : garantEmail && isValidEmail(garantEmail) ? "border-green-400" : ""}`}
                  placeholder="jean.dupont@email.fr"
                />
                {garantEmail && !isValidEmail(garantEmail) && <p className="text-xs text-red-500 mt-1">Format invalide</p>}
                {garantEmail && isValidEmail(garantEmail) && <p className="text-xs text-green-600 mt-1">✅ Format valide</p>}
                <p className="text-xs text-gray-400 mt-1">L'acte de cautionnement lui sera envoyé à cette adresse pour signature électronique.</p>
              </div>
            </section>

            <button
              onClick={handleSubmitInfo}
              disabled={saving}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {saving ? "Envoi en cours…" : "Envoyer l'acte de caution à mon garant →"}
            </button>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  /* ── PRÉVISUALISATION + SIGNATURE DU BAIL ── */
  const cautionData = bail.status === "caution_signed" || bail.status === "signed_tenant" || bail.status === "signed_both"
    ? {
        garantCivilite: garantCivilite ?? "M.",
        garantPrenomNom: garantPrenomNom ?? "",
        garantDateNaissance: garantDateNaissance ?? "",
        garantAdresse: garantAdresse ?? "",
        adresse: a.adresse, ville: a.ville, titre: a.titre, surface: a.surface,
        dateDebut: bail.dateDebut, irlTrimestre: bail.irlTrimestre, irlValeur: bail.irlValeur,
        prenomNom: prenomNom ?? "", adresseLocataire: adresseLocataire ?? "",
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
    prenomNom, dateNaissance, villeNaissance, departementNaissance, adresseLocataire, tel, mailLocataire,
    garantCivilite, garantPrenomNom, garantDateNaissance, garantAdresse,
    typeChauffage: a.typeChauffage, courExtVegetalisee: a.courExtVegetalisee,
    loyerPrecedentLocataire: a.loyerPrecedentLocataire, coutEnergMensuel: a.coutEnergMensuel,
    dpePdf: a.dpePdf,
    inventaire: a.inventaire,
    cautionData,
    garantLieu: bail.garantLieu,
    signatureCaution: bail.signatureCaution,
  };

  const signatureSlot = (
    <div className="space-y-2">
      <SignaturePad ref={sigRef} onChange={(url) => setSignatureDataUrl(url)} />
      <p className="text-xs text-gray-400">Signez ici avec votre doigt ou la souris</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bandeau fixe */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Étape 2 / 2 — Lecture et signature du bail</p>
            <p className="text-sm font-medium text-gray-800">
              ✅ Acte de cautionnement signé — Lisez attentivement le contrat ci-dessous
            </p>
          </div>
        </div>
      </div>

      {/* Bannière caution signée */}
      <div className="print:hidden max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <strong>✅ {bail.garantPrenomNom ?? "Votre garant"} a signé l'acte de cautionnement.</strong>{" "}
          Vous pouvez maintenant lire le contrat de location et apposer votre signature électronique.
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 print:p-0">
        <BailDocument
          typeBail={bail.appartement.typeBail}
          data={docData}
          locataireSignatureSlot={signatureSlot}
          bailleurSignatureSlot={
            <div>
              <div className="border-b border-dashed border-gray-300 h-16 mt-2" />
              <p className="text-xs text-gray-400 mt-1">Signature bailleur (apposée par le propriétaire)</p>
            </div>
          }
        />
      </div>

      {/* Bouton de validation */}
      <div className="print:hidden sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleSignBail}
            disabled={saving || !signatureDataUrl}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-base hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {saving ? "Signature en cours…" : !signatureDataUrl ? "✍️ Signez dans le document ci-dessus" : "✅ Valider ma signature et signer le bail"}
          </button>
          <p className="text-xs text-center text-gray-400">
            Signature électronique simple — règlement eIDAS n° 910/2014 — valide pour les contrats de location (loi ALUR 2014)
          </p>
        </div>
      </div>
    </div>
  );
}
