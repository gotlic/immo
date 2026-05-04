/**
 * Notice d'information relative aux droits et obligations des locataires et bailleurs
 * Conforme à la loi n° 89-462 du 6 juillet 1989 — loi ALUR
 */
export default function NoticeInformation() {
  return (
    <div className="text-[11px] leading-relaxed text-gray-900 space-y-3">
      <div className="text-center space-y-1 mb-4">
        <p className="text-[10px] text-gray-500 italic">
          NOUVEAU LOCATAIRE : n'oubliez pas de mettre vos compteurs d'énergie à votre nom dès la signature du bail
        </p>
        <h1 className="text-sm font-bold uppercase tracking-wide">Notice d'information</h1>
        <p className="text-[10px] text-gray-600">annexée aux contrats de location de logement à usage de résidence principale</p>
        <p className="text-[10px] font-semibold uppercase">Infos relatives aux droits et obligations des parties</p>
      </div>

      <hr className="border-gray-300" />

      {/* PRÉAMBULE */}
      <section>
        <h2 className="font-bold uppercase text-[10px] tracking-wide mb-1">Préambule</h2>
        <p>Le régime de droit commun des baux d'habitation, applicable aux locations de logements constituant la résidence principale des locataires, est défini principalement par la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs.</p>
        <p className="mt-1">La présente notice d'information rappelle les principaux droits et obligations des parties ainsi que certaines des voies de conciliation et de recours possibles pour régler leurs litiges.</p>
        <p className="mt-1">Si la plupart des règles s'appliquent indifféremment à l'ensemble des locations, la loi prévoit certains aménagements pour les locations meublées ou les colocations afin de prendre en compte les spécificités attachées à ces catégories de location.</p>
        <p className="mt-1">Pour prétendre à la qualification de meublé, un logement doit être équipé d'un mobilier en nombre et en qualité suffisants pour permettre au locataire d'y dormir, manger et vivre convenablement au regard des exigences de la vie courante (titre 1<sup>er</sup> bis de la loi du 6 juillet 1989).</p>
        <p className="mt-1">Les colocations, définies comme la location d'un même logement par plusieurs locataires, sont soumises au régime applicable le cas échéant aux locations nues ou meublées et aux règles spécifiques prévues par la loi en matière de colocation (art. 8-1).</p>
      </section>

      {/* 1 — Établissement du bail */}
      <section>
        <h2 className="font-bold text-[11px] border-b border-gray-300 pb-0.5 mb-1">1. Établissement du bail</h2>

        <h3 className="font-semibold mt-2 mb-0.5">1.1. Forme et contenu du contrat</h3>
        <p>Le contrat de location est établi par écrit et respecte un bail type défini par décret. Le bail peut être établi directement entre le bailleur et le locataire, éventuellement avec l'aide d'un intermédiaire (agent immobilier, administrateur de biens, huissier, notaire…). Il doit être fait en autant d'originaux que de parties et remis à chacune d'elles.</p>
        <p className="mt-1">Le contrat de location doit comporter certaines mentions et notamment l'identité des parties, la description du logement, sa surface habitable et les conditions financières du contrat. En cas d'inexactitude supérieure à 5 % de la surface habitable mentionnée au bail d'une location nue, le locataire peut demander une diminution de loyer proportionnelle à l'écart constaté (art. 3 et 3-1).</p>
        <p className="mt-1">Certaines clauses sont interdites. Si elles figurent dans le contrat, elles sont alors considérées comme étant inapplicables (art. 4). Le bailleur est tenu de remettre au locataire un dossier de diagnostic technique lors de la signature du contrat (art. 3-3).</p>

        <h3 className="font-semibold mt-2 mb-0.5">1.2. Durée du contrat</h3>
        <p><span className="font-medium">Location nue :</span> Le bail est conclu pour une durée minimum de trois ans (personne physique) ou six ans (personne morale). À défaut de congé, il est renouvelé dans les mêmes conditions (art. 10). Par exception, la durée peut être inférieure à trois ans, mais d'au minimum un an, pour raisons familiales ou professionnelles (art. 11).</p>
        <p className="mt-1"><span className="font-medium">Location meublée :</span> Le bail est conclu pour une durée d'au moins un an, reconduit automatiquement à défaut de congé. Lorsque le locataire est étudiant, les parties peuvent convenir d'un bail de neuf mois non reconductible tacitement (art. 25-7).</p>

        <h3 className="font-semibold mt-2 mb-0.5">1.3. Conditions financières</h3>

        <p className="font-medium mt-1">1.3.1. Loyer</p>
        <p><span className="italic">Fixation du loyer initial (art. 17 et 18) :</span> En principe, le loyer initial est fixé librement. Dans les zones de tension du marché locatif, un décret fixe chaque année le montant maximum d'évolution des loyers en cas de relocation. Dans certaines zones dotées d'un observatoire local des loyers agréé, le loyer ne peut excéder le loyer de référence majoré fixé par arrêté préfectoral.</p>
        <p className="mt-1"><span className="italic">Révision annuelle (art. 17-1) :</span> Lorsqu'une clause le prévoit, le loyer peut être révisé une fois par an. Cette augmentation ne peut dépasser la variation de l'IRL publié par l'INSEE. Le bailleur dispose d'un délai d'un an pour en faire la demande ; passé ce délai, la révision n'est plus possible.</p>
        <p className="mt-1"><span className="italic">Évolution consécutive à des travaux (art. 6 et 17-1) :</span> Le loyer peut être revu à la hausse ou à la baisse lorsque bailleur et locataire ont convenu de travaux à exécuter pendant l'exécution du contrat.</p>
        <p className="mt-1"><span className="italic">Ajustement au renouvellement (art. 17-2) :</span> Hors zones de tension, le loyer ne fait l'objet d'aucune réévaluation au renouvellement sauf s'il est manifestement sous-évalué. Toute hausse supérieure à 10 % doit être étalée par sixième sur six ans.</p>

        <p className="font-medium mt-2">1.3.2. Charges locatives (art. 23)</p>
        <p>Les charges récupérables correspondent à certaines catégories de dépenses définies par décret. Le bailleur peut les récupérer ponctuellement (sur justificatifs) ou par provisions mensuelles avec régularisation annuelle. Pour les locations meublées et colocations, un forfait de charges est possible (art. 8-1 et 25-10).</p>

        <p className="font-medium mt-2">1.3.3. Contribution aux économies de charges (art. 23-1)</p>
        <p>Dans le cadre d'une location nue, une contribution financière peut être demandée au locataire lorsque le bailleur a réalisé des travaux d'économies d'énergie, limitée à quinze années maximum.</p>

        <p className="font-medium mt-2">1.3.4. Modalités de paiement</p>
        <p>Le paiement du loyer et des charges s'effectue à la date prévue au contrat. Le bailleur est tenu de remettre gratuitement une quittance sur demande du locataire, sans frais (art. 21).</p>

        <h3 className="font-semibold mt-2 mb-0.5">1.4. Garanties</h3>
        <p><span className="font-medium">Dépôt de garantie (art. 22) :</span> Limité à un mois de loyer hors charges pour les locations nues, deux mois pour les locations meublées (art. 25-6). Non révisable en cours ou au renouvellement du bail.</p>
        <p className="mt-1"><span className="font-medium">Garantie autonome (art. 22-1-1) :</span> Peut être souscrite en lieu et place du dépôt de garantie, dans la limite du montant de celui-ci.</p>
        <p className="mt-1"><span className="font-medium">Cautionnement (art. 22-1) :</span> La caution s'engage envers le bailleur à payer les dettes locatives du locataire en cas de défaillance. L'engagement doit être écrit. Le bailleur ne peut exiger de cautionnement s'il a déjà souscrit une garantie locative (sauf logement loué à un étudiant ou apprenti). L'engagement peut être à durée déterminée ou indéterminée (résiliable par LRAR, avec effet à l'expiration du bail en cours).</p>

        <h3 className="font-semibold mt-2 mb-0.5">1.5. État des lieux (art. 3-2)</h3>
        <p>Un état des lieux est établi contradictoirement lors de la remise et de la restitution des clés. Il est établi par écrit et un exemplaire est remis à chaque partie. Le locataire peut le compléter dans les dix jours suivant son établissement. En cas de désaccord, un huissier peut être mandaté, les frais étant partagés par moitié. Pour les locations meublées, un inventaire du mobilier est également établi (art. 25-5).</p>
      </section>

      {/* 2 — Droits et obligations */}
      <section>
        <h2 className="font-bold text-[11px] border-b border-gray-300 pb-0.5 mb-1">2. Droits et obligations des parties</h2>

        <h3 className="font-semibold mt-2 mb-0.5">2.1. Obligations générales du bailleur (art. 6)</h3>
        <p>Le bailleur est tenu de : <span className="font-medium">délivrer un logement décent</span> (répondant aux caractéristiques fixées par décret) ; <span className="font-medium">délivrer un logement en bon état</span> d'usage et de réparations ; <span className="font-medium">entretenir les locaux</span> et y effectuer les réparations nécessaires hors réparations locatives. Il ne peut s'opposer aux aménagements du locataire (hors travaux de transformation) et doit lui assurer un usage paisible du logement.</p>
        <p className="mt-1">En cas de troubles de voisinage causés par les occupants, le bailleur doit mettre en demeure les responsables et utiliser les droits dont il dispose pour y mettre fin.</p>

        <h3 className="font-semibold mt-2 mb-0.5">2.2. Obligations générales du locataire (art. 7)</h3>
        <p>Le locataire doit : <span className="font-medium">payer le loyer et les charges</span> à la date prévue ; <span className="font-medium">utiliser paisiblement le logement</span> dans le respect de la tranquillité du voisinage et du règlement intérieur ; respecter la destination du logement ; ne pas sous-louer sans accord écrit du bailleur.</p>
        <p className="mt-1">Le locataire a le droit d'aménager librement le logement mais ne peut y faire de travaux de transformation sans accord écrit du bailleur. Il doit laisser exécuter certains travaux décidés par le bailleur (réparations urgentes, amélioration, performance énergétique, mise aux normes).</p>
        <p className="mt-1">Le locataire est tenu de <span className="font-medium">s'assurer contre les risques locatifs</span> et d'en justifier chaque année sur demande du bailleur. À défaut, le bailleur peut demander la résiliation du bail ou souscrire une assurance à la place du locataire.</p>
      </section>

      {/* 3 — Fin de contrat */}
      <section>
        <h2 className="font-bold text-[11px] border-b border-gray-300 pb-0.5 mb-1">3. Fin de contrat et sortie du logement</h2>

        <h3 className="font-semibold mt-2 mb-0.5">3.1.1. Congé délivré par le locataire</h3>
        <p>Le locataire peut donner congé à tout moment par lettre recommandée avec avis de réception, acte d'huissier ou remise en main propre.</p>
        <p className="mt-1"><span className="font-medium">Durée du préavis :</span> trois mois en location nue (réduit à un mois dans les zones de tension ou en cas d'obtention d'emploi, mutation, perte d'emploi, état de santé, RSA, AAH, attribution d'un logement social) ; un mois en location meublée.</p>

        <h3 className="font-semibold mt-2 mb-0.5">3.1.2. Congé délivré par le bailleur</h3>
        <p>Le bailleur peut donner congé à l'échéance du bail uniquement dans trois cas : reprise pour occupation personnelle ou par un proche ; vente du logement (le locataire est alors prioritaire pour acquérir) ; motif légitime et sérieux (non-respect des obligations, retards répétés de paiement, troubles de voisinage…).</p>
        <p className="mt-1">Le préavis doit être délivré <span className="font-medium">au moins six mois avant la fin du bail</span> (location nue) ou trois mois (location meublée), par LRAR, acte d'huissier ou remise en main propre. Un congé frauduleux expose le bailleur à une amende pénale pouvant aller jusqu'à 30 000 € (personne morale).</p>

        <h3 className="font-semibold mt-2 mb-0.5">3.2. Sortie du logement</h3>
        <p><span className="font-medium">État des lieux de sortie (art. 3-2) :</span> Établi contradictoirement à la remise des clés, dans les mêmes conditions que l'état des lieux d'entrée. Aucuns frais ne peuvent être facturés au locataire lorsque le bailleur se fait représenter par un tiers.</p>
        <p className="mt-1"><span className="font-medium">Restitution du dépôt de garantie (art. 22) :</span> Dans un délai maximal de deux mois à compter de la remise des clés (un mois si l'état des lieux de sortie est conforme à celui d'entrée), déduction faite des sommes justifiées dues. Tout retard entraîne une majoration de 10 % du loyer mensuel par mois de retard commencé.</p>
      </section>

      {/* 4 — Règlement des litiges */}
      <section>
        <h2 className="font-bold text-[11px] border-b border-gray-300 pb-0.5 mb-1">4. Règlement des litiges locatifs</h2>

        <h3 className="font-semibold mt-2 mb-0.5">4.1. Règles de prescriptions (art. 7-1)</h3>
        <p>La durée de prescription en matière locative est en principe de trois ans. En matière de révision de loyer, le bailleur ne dispose que d'un délai d'un an.</p>

        <h3 className="font-semibold mt-2 mb-0.5">4.2. Règlement amiable — Commissions départementales de conciliation (art. 20)</h3>
        <p>Les commissions départementales de conciliation (CDC), présentes dans chaque département, sont compétentes pour connaître des litiges individuels ou collectifs entre bailleurs et locataires (dépôt de garantie, état des lieux, loyers, charges, réparations, décence, congés…). La saisine est gratuite. La CDC doit traiter les litiges dans un délai de deux mois. Sa saisine est obligatoire avant toute action en justice pour les litiges relatifs à l'ajustement des loyers au renouvellement.</p>

        <h3 className="font-semibold mt-2 mb-0.5">4.3. Action en justice</h3>
        <p>Tout litige relatif à un bail d'habitation relève exclusivement du <span className="font-medium">tribunal judiciaire</span> dans le ressort duquel se situe le logement.</p>
        <p className="mt-1"><span className="font-medium">Clause résolutoire (art. 24) :</span> En cas de défaut de paiement des loyers/charges, non-versement du dépôt de garantie, défaut d'assurance ou troubles de voisinage constatés par décision de justice, la clause résolutoire peut être mise en œuvre après commandement par huissier. Le locataire dispose de deux mois pour régler sa dette.</p>
        <p className="mt-1"><span className="font-medium">Résiliation judiciaire :</span> Si la clause résolutoire n'est pas invoquée ou ne couvre pas le motif, le bailleur peut saisir directement le juge. Celui-ci peut accorder des délais de paiement jusqu'à trois ans ou ordonner l'expulsion.</p>

        <h3 className="font-semibold mt-2 mb-0.5">4.4. Prévention des expulsions</h3>
        <p><span className="font-medium">Fonds de solidarité pour le logement (FSL) :</span> Accorde des aides financières (prêts, subventions, garanties) aux personnes ayant de faibles ressources pour leurs dépenses de logement. S'adresser aux services du conseil départemental.</p>
        <p className="mt-1"><span className="font-medium">CCAPEX :</span> La commission de coordination des actions de prévention des expulsions locatives délivre des avis et recommandations en cas d'impayé ou de menace d'expulsion. S'adresser à la préfecture de département.</p>

        <h3 className="font-semibold mt-2 mb-0.5">4.5. Procédure d'expulsion</h3>
        <p>Le locataire ne peut être expulsé que sur le fondement d'une décision de justice. Le bailleur qui procède lui-même à l'expulsion est passible de trois ans de prison et 30 000 € d'amende. L'expulsion ne peut avoir lieu qu'après un commandement de quitter les lieux signifié par huissier et un délai de deux mois. Durant la <span className="font-medium">trêve hivernale (1<sup>er</sup> novembre – 31 mars)</span>, aucune expulsion forcée ne peut être exécutée.</p>
      </section>

      {/* 5 — Contacts */}
      <section>
        <h2 className="font-bold text-[11px] border-b border-gray-300 pb-0.5 mb-1">5. Contacts utiles</h2>
        <ul className="list-disc list-inside space-y-0.5 text-[10px] text-gray-700">
          <li><span className="font-medium">ADIL</span> (Agences départementales d'information sur le logement) — conseil gratuit et neutre : <span className="font-mono">www.anil.org</span></li>
          <li><span className="font-medium">CAF / MSA</span> — organismes payeurs des aides au logement</li>
          <li><span className="font-medium">Maisons de justice et du droit / Points d'accès au droit</span> — accueil gratuit et anonyme : <span className="font-mono">www.annuaires.justice.gouv.fr</span></li>
          <li><span className="font-medium">Ministère du Logement</span> : <span className="font-mono">www.cohesion-territoires.gouv.fr</span></li>
          <li><span className="font-medium">Service-Public.fr</span> : <span className="font-mono">www.service-public.fr</span></li>
          <li><span className="font-medium">Allo Service Public</span> : 3939 (0,15 €/min)</li>
        </ul>
      </section>
    </div>
  );
}
