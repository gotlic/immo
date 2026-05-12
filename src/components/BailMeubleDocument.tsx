"use client";

// Bail meublé — conforme loi ALUR / décret 29 mai 2015
// Modèle de référence pour les autres types de bail.

import { formatDateSlash, addOneYear, addOneYearExact, montantEnLettres, formatNiveau } from "@/lib/bail-utils";
import CautionDocument, { CautionDocumentData } from "@/components/CautionDocument";
import PdfPages from "@/components/PdfPages";
import NoticeInformation from "@/components/NoticeInformation";

export type BailDocumentData = {
  // Appartement
  adresse: string | null;
  ville: string | null;
  etage: number | null;
  surface: number;
  nbPieces: number;
  loyer: number;
  montantCharges: number | null;
  detailCharges: string | null;

  // Métadonnées bail
  dateDebut: string | null;
  irlTrimestre: string | null;
  irlValeur: string | null;
  loyerReference: string | null;
  loyerReferenceMaj: string | null;

  // Locataire
  prenomNom: string | null;
  dateNaissance: string | null;
  villeNaissance?: string | null;
  departementNaissance?: string | null;
  adresseLocataire: string | null;
  tel: string | null;
  mailLocataire: string | null;

  // Garant
  garantCivilite: string | null;
  garantPrenomNom: string | null;
  garantDateNaissance: string | null;
  garantAdresse: string | null;

  // Appartement extras
  typeChauffage: string | null;
  courExtVegetalisee: boolean;
  loyerPrecedentLocataire: number | null;
  coutEnergMensuel: number | null;

  // DPE
  dpePdf: string | null;

  // Annexes physiques (optionnel)
  inventaire?: {
    dateEntree: string | null;
    lignes: string; // JSON
    remarqueCuisine?: string | null;
    remarqueSDB?: string | null;
    remarquePiece?: string | null;
    remarqueGeneral?: string | null;
  } | null;
  cautionData?: CautionDocumentData | null;
  garantLieu?: string | null;
  signatureCaution?: string | null;
  signatureCautionAt?: string | null;
};

type SignatureSlotProps = {
  label: string;
  name: string;
  signatureDataUrl?: string | null;
  signedAt?: string | null;
  extra?: string | null;
  placeholder?: React.ReactNode;
};

function SignatureSlot({ label, name, signatureDataUrl, signedAt, extra, placeholder }: SignatureSlotProps) {
  return (
    <div>
      <p className="font-medium mb-1">{label}</p>
      <p className="text-sm text-gray-600 mb-2">{name}</p>
      {signatureDataUrl ? (
        <div className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="border border-gray-200 rounded-lg bg-white h-24 flex items-center justify-center overflow-hidden">
            <img src={signatureDataUrl} alt={`Signature ${label}`} className="max-h-full max-w-full object-contain p-1" />
          </div>
          {signedAt && (
            <p className="text-xs text-green-700">
              ✅ Signé électroniquement le {new Date(signedAt).toLocaleString("fr-FR")}
              {extra ? ` · IP : ${extra}` : ""}
            </p>
          )}
        </div>
      ) : placeholder ? (
        <>{placeholder}</>
      ) : (
        <div>
          <div className="border-b border-dashed border-gray-300 h-16 mt-2" />
          <p className="text-xs text-gray-400 mt-1">Lu et approuvé</p>
        </div>
      )}
    </div>
  );
}

type InventaireRow = {
  id: string; objet: string;
  nbEntree: number | string; etatEntree: string;
  nbSortie?: number | string | null; etatSortie?: string | null;
};

function InventaireAnnexe({ inventaire }: { inventaire: NonNullable<BailDocumentData["inventaire"]> }) {
  let lignes: InventaireRow[] = [];
  try { lignes = JSON.parse(inventaire.lignes); } catch { /* empty */ }

  return (
    <div className="text-[12px] space-y-4">
      {lignes.length > 0 ? (
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-2 py-1 border border-gray-200 font-semibold">Élément</th>
              <th className="text-center px-2 py-1 border border-gray-200 font-semibold w-12">Qté</th>
              <th className="text-left px-2 py-1 border border-gray-200 font-semibold w-32">État (entrée)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="odd:bg-white even:bg-gray-50">
                <td className="px-2 py-1 border border-gray-200">{l.objet}</td>
                <td className="px-2 py-1 border border-gray-200 text-center">{l.nbEntree}</td>
                <td className="px-2 py-1 border border-gray-200">{l.etatEntree}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 italic">Aucun élément enregistré</p>
      )}
      {(inventaire.remarqueCuisine || inventaire.remarqueSDB || inventaire.remarquePiece || inventaire.remarqueGeneral) && (
        <div className="space-y-1 text-[11px] text-gray-600 border-t border-gray-200 pt-3 mt-3">
          {inventaire.remarqueCuisine && <p><strong>Cuisine :</strong> {inventaire.remarqueCuisine}</p>}
          {inventaire.remarqueSDB && <p><strong>Salle de bain :</strong> {inventaire.remarqueSDB}</p>}
          {inventaire.remarquePiece && <p><strong>Pièce principale :</strong> {inventaire.remarquePiece}</p>}
          {inventaire.remarqueGeneral && <p><strong>Remarques générales :</strong> {inventaire.remarqueGeneral}</p>}
        </div>
      )}
      <p className="text-[10px] text-gray-500 italic border-t border-gray-200 pt-3 mt-3">
        Donné à titre indicatif, sera validé et signé par le locataire et le bailleur lors des états des lieux d&apos;entrée et de sortie.
      </p>
    </div>
  );
}

type Props = {
  data: BailDocumentData;
  /** Slot de signature pour le bailleur (pass null pour espace vide, undefined pour placeholder tirets) */
  bailleurSignatureSlot?: React.ReactNode;
  bailleurSignatureUrl?: string | null;
  bailleurSignatureAt?: string | null;
  locataireSignatureSlot?: React.ReactNode;
  locataireSignatureUrl?: string | null;
  locataireSignatureAt?: string | null;
  locataireIp?: string | null;
};

export default function BailMeubleDocument({
  data,
  bailleurSignatureSlot,
  bailleurSignatureUrl,
  bailleurSignatureAt,
  locataireSignatureSlot,
  locataireSignatureUrl,
  locataireSignatureAt,
  locataireIp,
}: Props) {
  const {
    adresse, ville, etage, surface, nbPieces, loyer,
    montantCharges, detailCharges, dateDebut, irlTrimestre, irlValeur,
    loyerReference, loyerReferenceMaj,
    prenomNom, dateNaissance, villeNaissance, departementNaissance, adresseLocataire, tel, mailLocataire,
    garantCivilite, garantPrenomNom, garantAdresse,
    typeChauffage, courExtVegetalisee, loyerPrecedentLocataire, coutEnergMensuel, dpePdf,
  } = data;

  const charges = montantCharges ?? 0;
  const totalCC = loyer + charges;
  const depot = loyer;
  const niveau = formatNiveau(etage);

  const dateDebutFR = dateDebut ? formatDateSlash(dateDebut) : "___________";
  const dateFinFR = dateDebut ? formatDateSlash(addOneYear(dateDebut)) : "___________";
  const dateRevisionSlash = dateDebut ? formatDateSlash(addOneYearExact(dateDebut)) : "__/__/____";

  // "Fait à" : date réelle de signature du locataire ou, à défaut, aujourd'hui
  const dateSignatureFR = locataireSignatureAt
    ? new Date(locataireSignatureAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const tenantFilled = !!prenomNom;

  return (
    <div className="bail-doc bg-white text-sm text-gray-900 leading-relaxed">

      {/* Titre */}
      <div className="text-center mb-6 space-y-1">
        <h1 className="text-xl font-bold uppercase tracking-wide">Contrat de location</h1>
        <p className="text-xs text-gray-500">
          Soumis au titre I<sup>er</sup> bis de la loi du 6 juillet 1989 — bail meublé conforme à la loi ALUR (décret du 29 mai 2015)
        </p>
        <p className="font-semibold uppercase text-sm">Locaux meublés à usage d&apos;habitation</p>
      </div>

      <hr className="my-4 border-gray-300" />

      {/* I — Parties */}
      <section className="mb-6">
        <h2 className="bail-h2">I. Désignation des parties</h2>
        <p className="mb-3">Le présent contrat est conclu entre les soussignés&nbsp;:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-300 rounded p-3 space-y-0.5">
            <p className="font-semibold">Bailleur</p>
            <p>Gautier Lictevout</p>
            <p className="text-xs text-gray-500">Né le 02/07/1975</p>
            <p className="text-xs text-gray-500">430 rue du Blocus, 59710 Mérignies</p>
            <p className="text-xs text-gray-500">Tél.&nbsp;: 06 83 97 48 72</p>
            <p className="text-xs text-gray-500">Email&nbsp;: gautier@lictevout.com</p>
            <p className="text-xs font-medium mt-1">Désigné ci-après « le Bailleur »</p>
          </div>
          <div className={`border rounded p-3 space-y-0.5 ${!tenantFilled ? "border-amber-300 bg-amber-50" : "border-gray-300"}`}>
            <p className="font-semibold">Locataire</p>
            {tenantFilled ? (
              <>
                <p>{prenomNom}</p>
                {dateNaissance && (
                  <p className="text-xs text-gray-500">
                    Né(e) le&nbsp;: {formatDateSlash(dateNaissance)}
                    {villeNaissance && <> à {villeNaissance}</>}
                    {departementNaissance && <> ({departementNaissance})</>}
                  </p>
                )}
                {adresseLocataire && <p className="text-xs text-gray-500">{adresseLocataire}</p>}
                {tel && <p className="text-xs text-gray-500">Tél.&nbsp;: {tel}</p>}
                {mailLocataire && <p className="text-xs text-gray-500">Email&nbsp;: {mailLocataire}</p>}
              </>
            ) : (
              <p className="italic text-amber-600 text-xs">En attente des informations du locataire</p>
            )}
            <p className="text-xs font-medium mt-1">Désigné ci-après « le Locataire »</p>
          </div>
        </div>
      </section>

      {/* II — Objet */}
      <section className="mb-6">
        <h2 className="bail-h2">II. Objet du contrat</h2>
        <p className="mb-2">Le présent contrat a pour objet la location d&apos;un logement meublé ainsi déterminé&nbsp;:</p>

        <h3 className="bail-h3">A. Consistance du logement</h3>
        <p><strong>Adresse&nbsp;:</strong> {adresse ?? `${ville ?? "LILLE"}, 4 rue Flamen`}{niveau ? `, ${niveau}` : ""}</p>
        <p><strong>Type d&apos;habitat&nbsp;:</strong> ☑ collectif / ☑ monopropriété</p>
        <p><strong>Période de construction&nbsp;:</strong> ☑ avant 1949</p>
        <p><strong>Surface habitable&nbsp;:</strong> {surface} m²&nbsp;&nbsp;&nbsp;<strong>Pièces principales&nbsp;:</strong> {nbPieces}</p>

        <h3 className="bail-h3 mt-3">B. Destination des locaux</h3>
        <p>☑ Usage d&apos;habitation</p>

        <h3 className="bail-h3 mt-3">C. Locaux privatifs accessoires</h3>
        <p>☑ Aucun</p>

        <h3 className="bail-h3 mt-3">D. Parties communes</h3>
        <p>☑ Local poubelle &nbsp; ☑ Zone de partage : cave &nbsp; ☑ Lave-linge au sous-sol</p>

        <h3 className="bail-h3 mt-3">E. Technologies de l&apos;information</h3>
        <p>☑ Internet : accès wifi sécurisé (fibre Free partagée avec les autres locataires de l&apos;immeuble)</p>

        <h3 className="bail-h3 mt-3">F. Injonctions spécifiques</h3>
        <ul className="list-none space-y-0.5">
          <li>☑ Les animaux résidents ne sont pas autorisés dans le logement</li>
          <li>☑ L&apos;utilisation de radiateurs électriques d&apos;appoint est strictement interdite</li>
          <li>☑ La colocation n&apos;est pas permise pour ce logement</li>
          <li>☑ La sous-location de tout ou partie du logement est totalement interdite</li>
          {courExtVegetalisee && (
            <li>☑ Le logement dispose d&apos;une cour extérieure végétalisée. L&apos;entretien des végétaux (taille, désherbage, arrosage) est à la charge exclusive du locataire. À la restitution du logement, les extérieurs devront être rendus avec les végétaux soignés et taillés, les surfaces parfaitement entretenues et nettoyées.</li>
          )}
        </ul>

        {typeChauffage && (
          <>
            <h3 className="bail-h3 mt-3">G. Chauffage</h3>
            <p>
              <strong>Type de chauffage&nbsp;:</strong>{" "}
              {typeChauffage === "individuel_gaz" ? "Individuel au gaz" : "Individuel électrique"}
            </p>
            {typeChauffage === "individuel_gaz" && (
              <p className="text-xs text-gray-600 mt-1">
                L&apos;abonnement à un fournisseur de gaz est au choix et à la charge du locataire. Ce dernier s&apos;engage à effectuer un entretien annuel de la chaudière au plus tard le 31 décembre de chaque année.
              </p>
            )}
          </>
        )}
      </section>

      {/* III — Durée */}
      <section className="mb-6">
        <h2 className="bail-h2">III. Date de prise d&apos;effet et durée du contrat</h2>
        <p><strong>A. Date de prise d&apos;effet&nbsp;:</strong> {dateDebutFR}</p>
        <p className="mt-1"><strong>B. Durée du contrat&nbsp;:</strong> Un an, renouvelable tacitement, soit jusqu&apos;au {dateFinFR}</p>
        <p className="text-xs text-gray-500 mt-2">
          Les contrats de location de logements meublés sont reconduits tacitement à leur terme pour une durée d&apos;un an dans les mêmes conditions.
          Le locataire peut mettre fin au bail à tout moment après avoir donné congé (préavis d&apos;un mois).
          Le bailleur peut y mettre fin à son échéance après avoir donné congé (préavis de trois mois).
        </p>
      </section>

      {/* IV — Conditions financières */}
      <section className="mb-6">
        <h2 className="bail-h2">IV. Conditions financières</h2>

        <h3 className="bail-h3">A. Loyer</h3>
        <p><strong>Montant du loyer mensuel&nbsp;:</strong> {loyer.toLocaleString("fr-FR")} € — {montantEnLettres(loyer)}</p>
        {loyerReference && (
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            <p>Soumis au décret d&apos;encadrement des loyers à la relocation&nbsp;: ☑ Oui</p>
            <p>Soumis au loyer de référence majoré fixé par arrêté préfectoral&nbsp;: ☑ Oui</p>
            <p>Loyer de référence&nbsp;: {loyerReference} €/m²{loyerReferenceMaj ? ` — Majoré : ${loyerReferenceMaj} €/m²` : ""}</p>
            <p>Loyer du dernier locataire&nbsp;: {loyerPrecedentLocataire !== null && loyerPrecedentLocataire !== undefined
              ? `${loyerPrecedentLocataire.toLocaleString("fr-FR")} € / mois`
              : "Non applicable"}</p>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-600">
          Date de révision&nbsp;: {dateRevisionSlash} et tous les ans aux dates anniversaires<br />
          Trimestre de référence IRL&nbsp;: {irlTrimestre ?? "___"} — Indice&nbsp;: {irlValeur ?? "___"}
        </p>

        <h3 className="bail-h3 mt-3">B. Charges</h3>
        <p><strong>Forfait de charges mensuel&nbsp;:</strong> {charges.toLocaleString("fr-FR")} € — {montantEnLettres(charges)}</p>
        {detailCharges && (
          <p className="text-xs text-gray-600 mt-1"><strong>Inclus&nbsp;:</strong> {detailCharges}</p>
        )}

        <h3 className="bail-h3 mt-3">C. Modalités de paiement</h3>
        <p className="text-xs text-gray-600">
          Périodicité : mensuelle — Paiement à échoir — le 1<sup>er</sup> de chaque mois<br />
          Mode : Virement automatique — IBAN : FR76 1759 8000 0100 0206 2983 509 — BIC : LYDIFRP2XXX
        </p>
        <p className="mt-2">
          <strong>Total à la première échéance&nbsp;:</strong>{" "}
          {loyer.toLocaleString("fr-FR")} € HC + {charges.toLocaleString("fr-FR")} € charges = <strong>{totalCC.toLocaleString("fr-FR")} € CC/mois</strong>
        </p>

        <h3 className="bail-h3 mt-3">D. Dépenses énergétiques</h3>
        <p className="text-xs text-gray-600">
          Estimation des coûts annuels d&apos;énergie : voir le DPE joint en annexe.
          {coutEnergMensuel !== null && coutEnergMensuel !== undefined && (
            <> Coûts énergétiques mensuels constatés du précédent locataire&nbsp;: <strong>{coutEnergMensuel.toLocaleString("fr-FR")} € / mois</strong>.</>
          )}
          {(coutEnergMensuel === null || coutEnergMensuel === undefined) && (
            <> Coûts énergétiques du précédent locataire&nbsp;: <strong>Non applicable</strong>.</>
          )}
        </p>

        <h3 className="bail-h3 mt-3">E. Garanties du locataire</h3>
        <p>
          Le bailleur déclare accepter la caution fournie par le locataire. Un acte de cautionnement est signé pour cette location.
          {garantCivilite && garantPrenomNom && (
            <> Il entre en vigueur le {dateDebutFR}. Le garant est {garantCivilite} {garantPrenomNom}
            {garantAdresse ? `, domicilié(e) ${garantAdresse}` : ""}.</>
          )}
        </p>
      </section>

      {/* V — Dépôt de garantie */}
      <section className="mb-6">
        <h2 className="bail-h2">V. Garanties</h2>
        <p>
          Dépôt de garantie&nbsp;: <strong>un mois de loyer hors charges, soit {depot.toLocaleString("fr-FR")} € ({montantEnLettres(depot)})</strong>
        </p>
      </section>

      {/* VI — Clause résolutoire */}
      <section className="mb-6">
        <h2 className="bail-h2">VI. Clause résolutoire</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Le bail sera résilié de plein droit en cas d&apos;inexécution des obligations du locataire, notamment en cas de défaut de paiement
          des loyers et charges, de non-versement du dépôt de garantie, de défaut d&apos;assurance contre les risques locatifs ou de troubles
          de voisinage constatés par décision de justice. Pour tout défaut de paiement, un commandement de payer par acte d&apos;huissier est
          préalablement requis (mentionnant la faculté de saisir le FSL). Le locataire dispose de deux mois pour s&apos;acquitter des sommes dues.
        </p>
      </section>

      {/* VII — Annexes */}
      <section className="mb-8">
        <h2 className="bail-h2">VII. Annexes</h2>
        <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
          <li><strong>Annexe 1</strong> — Notice d&apos;information relative aux droits et obligations des locataires et bailleurs</li>
          <li><strong>Annexe 2</strong> — Diagnostic de Performance Énergétique (DPE){!dpePdf && <span className="italic text-gray-400"> — document à joindre</span>}</li>
          <li><strong>Annexe 3</strong> — Inventaire des éléments mobiliers et état des lieux à l&apos;entrée</li>
          <li><strong>Annexe 4</strong> — Acte de cautionnement solidaire</li>
        </ul>
      </section>

      {/* Signatures */}
      <div className="border-t border-gray-300 pt-6">
        <p className="text-sm mb-6">Fait à Lille, le {dateSignatureFR}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <SignatureSlot
            label="Le Bailleur"
            name="Gautier Lictevout"
            signatureDataUrl={bailleurSignatureUrl}
            signedAt={bailleurSignatureAt}
            placeholder={bailleurSignatureSlot}
          />
          <SignatureSlot
            label="Le Locataire"
            name={prenomNom ?? "___________________"}
            signatureDataUrl={locataireSignatureUrl}
            signedAt={locataireSignatureAt}
            extra={locataireIp}
            placeholder={locataireSignatureSlot}
          />
        </div>
      </div>

      {/* ═══════════════ ANNEXE 1 — Notice ═══════════════ */}
      <div className="annexe-page">
        <div className="annexe-header">
          <span className="annexe-num">Annexe 1</span>
          <span>Notice d&apos;information relative aux droits et obligations des locataires et bailleurs</span>
        </div>
        <NoticeInformation />
      </div>

      {/* ═══════════════ ANNEXE 2 — DPE ═══════════════ */}
      <div className="annexe-page">
        <div className="annexe-header">
          <span className="annexe-num">Annexe 2</span>
          <span>Diagnostic de Performance Énergétique (DPE)</span>
        </div>
        {dpePdf ? (
          <PdfPages src={dpePdf} />
        ) : (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            DPE non fourni — document à joindre
          </div>
        )}
      </div>

      {/* ═══════════════ ANNEXE 3 — Inventaire ═══════════════ */}
      <div className="annexe-page">
        <div className="annexe-header">
          <span className="annexe-num">Annexe 3</span>
          <span>Inventaire des éléments mobiliers et état des lieux à l&apos;entrée</span>
        </div>
        {data.inventaire ? (
          <InventaireAnnexe inventaire={data.inventaire} />
        ) : (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Inventaire non disponible
          </div>
        )}
      </div>

      {/* ═══════════════ ANNEXE 4 — Acte de cautionnement ═══════════════ */}
      <div className="annexe-page">
        <div className="annexe-header">
          <span className="annexe-num">Annexe 4</span>
          <span>Acte de cautionnement solidaire</span>
        </div>
        {data.cautionData ? (
          <CautionDocument
            data={data.cautionData}
            faitA={data.garantLieu ?? undefined}
            signatureImageUrl={data.signatureCaution}
          />
        ) : (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Acte de cautionnement — en attente de signature du garant
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 16mm; }
          body { font-size: 11px !important; }
          .bail-doc { padding: 0 !important; }
        }
        .bail-h2 { font-weight: 700; font-size: 0.875rem; margin-bottom: 0.5rem; margin-top: 0.25rem;
                   border-bottom: 1px solid #d1d5db; padding-bottom: 0.15rem; }
        .bail-h3 { font-weight: 600; font-size: 0.8rem; margin-top: 0.5rem; margin-bottom: 0.25rem; }
        .annexe-page { margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e5e7eb; page-break-before: always; }
        .annexe-header { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.8rem; font-weight: 600; color: #374151; }
        .annexe-num { background: #1f2937; color: white; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
