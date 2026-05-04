import { numberToFrench } from "@/lib/numberToFrench";

export type CautionDocumentData = {
  // Garant
  garantCivilite: string;
  garantPrenomNom: string;
  garantDateNaissance: string;
  garantAdresse: string;
  // Appartement
  adresse: string | null;
  ville: string | null;
  titre: string;
  surface: number;
  // Bail
  dateDebut: string | null;          // "2025-10-06"
  irlTrimestre: string | null;       // "T4 2024"
  irlValeur: string | null;          // "144.62"
  prenomNom: string;                 // locataire
  adresseLocataire: string;
  loyer: number;
  montantCharges: number | null;
  /** Date de signature du bail (ISO string) — si absente, on utilise dateDebut */
  signatureLocataireAt?: string | null;
};

/** Formate "2025-10-06" → "6 octobre 2025" */
function fmtDate(iso: string | null): string {
  if (!iso) return "___________";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Ajoute 10 ans à une date ISO */
function addYears(iso: string | null, years: number): string {
  if (!iso) return "___________";
  const d = new Date(iso + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Formate un montant en € avec lettres */
function montantLettres(n: number): string {
  return `${n.toLocaleString("fr-FR")} € (${numberToFrench(n)} euros)`;
}

type Props = {
  data: CautionDocumentData;
  signatureSlot?: React.ReactNode;
  /** Valeur du champ "Fait à" (ville) */
  faitA?: string;
  /** Si fourni, le champ "Fait à" devient éditable */
  onFaitAChange?: (v: string) => void;
  /** Signature image URL (pour affichage après signature) */
  signatureImageUrl?: string | null;
};

export default function CautionDocument({ data, signatureSlot, faitA, onFaitAChange, signatureImageUrl }: Props) {
  const {
    garantCivilite, garantPrenomNom, garantDateNaissance, garantAdresse,
    adresse, ville, titre, surface,
    dateDebut, irlTrimestre, irlValeur,
    prenomNom, adresseLocataire,
    loyer, montantCharges,
    signatureLocataireAt,
  } = data;

  // Date de signature : date réelle de signature du locataire si disponible, sinon dateDebut
  const dateSignature = signatureLocataireAt
    ? signatureLocataireAt.slice(0, 10)  // ISO date only
    : dateDebut;

  const adresseAppart = [adresse, ville].filter(Boolean).join(", ") || "___________";
  const charges = montantCharges ?? 89;
  // Engagement maximum = 10 renouvellements × 12 mois × loyer
  const maxEngagement = 10 * 12 * loyer;
  // Date de révision = 1 an après date de début
  const dateRevision = dateDebut
    ? fmtDate(new Date(new Date(dateDebut + "T00:00:00").setFullYear(new Date(dateDebut + "T00:00:00").getFullYear() + 1)).toISOString().slice(0, 10))
    : "___________";

  return (
    <div className="text-sm leading-relaxed text-gray-900 space-y-5 print:text-[11px]">
      {/* En-tête */}
      <div className="text-center space-y-1">
        <h1 className="text-base font-bold uppercase tracking-wide">Engagement de caution solidaire</h1>
        <p className="text-xs text-gray-500 italic">
          Conforme à l'article 22-1 de la loi n° 89-462 du 6 juillet 1989 tel que revu par la loi n° 2018-1021
          portant évolution du logement, de l'aménagement et du numérique
        </p>
      </div>

      <hr className="border-gray-300" />

      {/* Identité du garant */}
      <section>
        <p className="font-bold uppercase text-[11px] tracking-wide text-gray-600 mb-2">
          JE SOUSSIGNÉ(E) EN MA QUALITÉ DE CAUTION SIGNATAIRE DU PRÉSENT ENGAGEMENT :
        </p>
        <table className="w-full text-[12px]">
          <tbody>
            <tr>
              <td className="py-0.5 text-gray-500 w-48">Civilité :</td>
              <td className="py-0.5 font-medium">{garantCivilite}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Prénom et Nom :</td>
              <td className="py-0.5 font-medium">{garantPrenomNom}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Date de naissance :</td>
              <td className="py-0.5 font-medium">{garantDateNaissance ? fmtDate(garantDateNaissance) : "___________"}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Adresse :</td>
              <td className="py-0.5 font-medium">{garantAdresse}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Logement loué */}
      <section>
        <p className="mb-1.5">
          Après avoir reçu un exemplaire du contrat de location concernant :
        </p>
        <table className="w-full text-[12px]">
          <tbody>
            <tr>
              <td className="py-0.5 text-gray-500 w-48">Adresse du logement :</td>
              <td className="py-0.5 font-medium">{adresseAppart}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Situation / contenance :</td>
              <td className="py-0.5 font-medium">{titre}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Surface :</td>
              <td className="py-0.5 font-medium">{surface} m²</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Date d'effet du bail :</td>
              <td className="py-0.5 font-medium">{fmtDate(dateDebut)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Durée du bail :</td>
              <td className="py-0.5 font-medium">12 mois renouvelables</td>
            </tr>
            <tr>
              <td className="py-0.5 text-gray-500">Consenti à :</td>
              <td className="py-0.5 font-medium">{prenomNom}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Engagement */}
      <section>
        <p>
          Et après en avoir pris connaissance, déclare me porter caution solidaire, conformément à
          l'article 2292 du Code civil avec renonciation au bénéfice de discussion et de division,
        </p>
      </section>

      {/* Locataire */}
      <section>
        <p className="font-bold uppercase text-[11px] tracking-wide text-gray-600 mb-2">
          À L'ÉGARD DU LOCATAIRE CI-APRÈS IDENTIFIÉ :
        </p>
        <p className="font-medium">{prenomNom} — {adresseLocataire}</p>
      </section>

      {/* Bailleur */}
      <section>
        <p className="font-bold uppercase text-[11px] tracking-wide text-gray-600 mb-2">
          EN FAVEUR DU BAILLEUR CI-APRÈS IDENTIFIÉ :
        </p>
        <p className="font-medium">
          Gautier Lictevout<br />
          Adresse : 430 rue du Blocus — 59710 MÉRIGNIES
        </p>
        <p className="mt-1 text-[12px] text-gray-600 italic">
          Ainsi que de son ou ses successeurs en cas de vente des locaux loués.
        </p>
      </section>

      {/* Nature et étendue */}
      <section>
        <p className="font-bold uppercase text-[11px] tracking-wide text-gray-600 mb-2">
          NATURE ET ÉTENDUE DE L'ENGAGEMENT DE CAUTION :
        </p>
        <p className="mb-3">
          En ma qualité de caution, je garantis l'exécution des obligations du locataire résultant
          du bail précité, à savoir le paiement :
        </p>

        <ul className="space-y-2 ml-4">
          <li>
            <span className="font-semibold">Du loyer</span> selon les conditions de sa révision
            telles que prévues au contrat de location :
            <div className="ml-4 mt-1 space-y-0.5 text-[12px]">
              <p>
                Le montant du loyer initial contractuellement convenu est fixé à{" "}
                <strong>{montantLettres(loyer)}</strong>.
              </p>
              <p>
                L'indexation annuelle du loyer est contractuellement convenue selon la variation
                de l'indice de référence des loyers (I.R.L.) :{" "}
                <strong>{irlValeur ?? "___________"}</strong>
              </p>
              <p>Date de révision : <strong>{dateRevision}</strong> et dates anniversaires.</p>
              <p>
                Date ou trimestre de référence de l'IRL :{" "}
                <strong>{irlTrimestre ?? "___________"}</strong>
              </p>
            </div>
          </li>
          <li>
            <span className="font-semibold">Du dépôt de garantie :</span>{" "}
            {montantLettres(loyer)} (équivalent un mois de loyer hors charges)
          </li>
          <li>
            <span className="font-semibold">Des charges récupérables :</span>{" "}
            le montant du forfait est évalué à{" "}
            {montantLettres(charges)}
          </li>
          <li><span className="font-semibold">Des éventuelles indemnités d'occupation ou astreintes</span></li>
          <li><span className="font-semibold">Des dégradations et réparations locatives</span></li>
          <li><span className="font-semibold">Des frais et indemnités éventuels de procédure</span></li>
        </ul>
      </section>

      {/* Durée */}
      <section>
        <p className="font-bold uppercase text-[11px] tracking-wide text-gray-600 mb-2">
          DURÉE DE L'ENGAGEMENT DE CAUTION
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-[12px] italic mb-3">
          <p>
            L'avant-dernier alinéa de l'article 22-1 de la loi du 6 juillet 1989 prévoit que :
          </p>
          <p className="mt-2">
            « Lorsque le cautionnement d'obligations résultant d'un contrat de location conclu en
            application du présent titre ne comporte aucune indication de durée ou lorsque la durée
            du cautionnement est stipulée indéterminée, la caution peut le résilier unilatéralement.
            La résiliation prend effet au terme du contrat de location, qu'il s'agisse du contrat
            initial ou d'un contrat reconduit ou renouvelé, au cours duquel le bailleur reçoit
            notification de la résiliation. »
          </p>
        </div>
        <p>
          Le présent engagement est souscrit pour la durée du contrat de location ci-dessus désigné
          et des <strong>neuf renouvellements suivants</strong>, soit jusqu'au{" "}
          <strong>{addYears(dateDebut, 10)}</strong>.
        </p>
      </section>

      {/* Montant maximum */}
      <section>
        <p className="font-bold uppercase text-[11px] tracking-wide text-gray-600 mb-2">
          MONTANT MAXIMUM DE L'ENGAGEMENT :
        </p>
        <p>
          Le présent engagement est souscrit pour un montant maximum de{" "}
          <strong>{montantLettres(maxEngagement)}</strong>.
        </p>
        <p className="mt-2 text-[12px] text-gray-600">
          En cas de décès, il y aura solidarité entre mes héritiers ou représentants dans la mesure
          où ils seront tenus au paiement de la dette.
        </p>
      </section>

      {/* Signature */}
      <section className="pt-2">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-[12px] text-gray-500 flex-shrink-0">Fait à</p>
              {onFaitAChange ? (
                <input
                  type="text"
                  value={faitA ?? ""}
                  onChange={(e) => onFaitAChange(e.target.value)}
                  placeholder="Ville"
                  className="border-b border-gray-400 text-[12px] px-1 py-0 focus:outline-none focus:border-gray-700 bg-transparent w-36"
                />
              ) : (
                <span className="text-[12px] font-medium border-b border-gray-300 w-36 inline-block">
                  {faitA || "___________"}
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Le {fmtDate(dateDebut)}</p>
            {signatureSlot ? (
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Signature du garant</p>
                {signatureSlot}
              </div>
            ) : signatureImageUrl ? (
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Signature du garant</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signatureImageUrl} alt="Signature garant" className="h-16 w-auto max-w-64" />
                <p className="text-[11px] text-gray-500 mt-1">{garantPrenomNom}</p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Signature du garant</p>
                <div className="border-b border-dashed border-gray-300 h-16 w-64" />
                <p className="text-[11px] text-gray-400 mt-1">{garantPrenomNom}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="text-center text-[10px] text-gray-400 pt-4 border-t border-gray-200">
        Engagement caution solidaire — {garantPrenomNom}
      </div>
    </div>
  );
}
