import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { randomUUID } from "crypto";

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const bail = await prisma.bail.findUnique({
    where: { id: parseInt(id) },
    include: { appartement: { select: { titre: true, adresse: true, ville: true } } },
  });

  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const email = bail.mailLocataire ?? bail.emailInvitation;
  if (!email) return NextResponse.json({ error: "Email locataire manquant." }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const lienBail = `${baseUrl}/bail/${bail.token}`;
  const appart = bail.appartement;
  const adresseAppart = [appart.adresse, appart.ville].filter(Boolean).join(", ") || appart.titre;

  let newStatus: string;
  let garantToken: string | null = null;

  if (!bail.pasDeGarant && bail.garantEmail) {
    // Il y a un garant → générer son token et lui envoyer l'email
    garantToken = randomUUID();
    newStatus = "info_submitted";

    const lienCaution = `${baseUrl}/caution/${garantToken}`;
    const lienBailGarant = `${baseUrl}/bail/${bail.token}/view?from=garant`;

    try {
      await sendMail({
        to: bail.garantEmail,
        subject: `Acte de cautionnement solidaire — ${bail.prenomNom ?? "votre protégé(e)"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #1a1a1a;">Acte de cautionnement à signer</h2>
            <p>Bonjour ${bail.garantPrenomNom ?? ""},</p>
            <p>
              <strong>${bail.prenomNom ?? "Un locataire"}</strong> vous a désigné(e) comme caution solidaire
              pour son contrat de location.
            </p>
            <p>Vous pouvez consulter le contrat de location complet avant de signer :</p>
            <p style="text-align: center; margin: 16px 0;">
              <a href="${lienBailGarant}"
                style="background: #f3f4f6; color: #374151; padding: 10px 20px; border-radius: 8px;
                       text-decoration: none; font-weight: 600; border: 1px solid #d1d5db;">
                📄 Voir le bail complet
              </a>
            </p>
            <p>Puis, veuillez lire et signer l'acte de cautionnement solidaire :</p>
            <p style="text-align: center; margin: 16px 0;">
              <a href="${lienCaution}"
                style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px;
                       text-decoration: none; font-weight: bold;">
                Lire et signer l'acte de cautionnement →
              </a>
            </p>
            <p style="font-size: 12px; color: #666;">
              Si les boutons ne fonctionnent pas, copiez ces liens dans votre navigateur :<br/>
              Bail : <a href="${lienBailGarant}">${lienBailGarant}</a><br/>
              Acte de caution : <a href="${lienCaution}">${lienCaution}</a>
            </p>
            <p style="font-size: 11px; color: #999; margin-top: 24px;">
              En signant l'acte de cautionnement, vous vous portez caution solidaire conformément à l'article 22-1
              de la loi n° 89-462 du 6 juillet 1989.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[send-to-tenant] Email garant failed:", err);
      // Non-bloquant
    }
  } else {
    // Pas de garant → prêt pour signature directe
    newStatus = "caution_signed";
  }

  // Mettre à jour le statut du bail (+ garantToken si applicable)
  await prisma.bail.update({
    where: { id: parseInt(id) },
    data: {
      status: newStatus,
      ...(garantToken ? { garantToken } : {}),
    },
  });

  // Email au locataire
  const prenom = bail.prenomNom ? bail.prenomNom.split(" ")[0] : "";
  const hasGarant = !bail.pasDeGarant && bail.garantPrenomNom;

  await sendMail({
    to: email,
    subject: `Votre contrat de location — ${adresseAppart}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #1a1a1a;">
        <h2 style="color: #1a1a1a;">Votre bail est prêt</h2>
        <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
        <p>
          Votre contrat de location pour <strong>${adresseAppart}</strong> a été établi.
          ${hasGarant
            ? `Un email a également été envoyé à votre garant <strong>${bail.garantPrenomNom}</strong>
               pour signature de l'acte de cautionnement. Dès sa signature, vous recevrez un email
               vous invitant à signer le bail.`
            : "Vous pouvez dès maintenant le lire et le signer électroniquement."}
        </p>
        <p>
          Vous pouvez prévisualiser et télécharger le bail avant de le signer :
        </p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${lienBail}"
            style="background: #1a1a1a; color: white; padding: 14px 28px; border-radius: 8px;
                   text-decoration: none; font-weight: bold; font-size: 15px;">
            📄 Accéder à mon bail →
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">
          Pour enregistrer le bail en PDF : ouvrez le lien ci-dessus, cliquez sur
          <strong>« Télécharger en PDF »</strong> ou utilisez <strong>Fichier → Imprimer → Enregistrer en PDF</strong>.
        </p>
        <p style="font-size: 12px; color: #999;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
          <a href="${lienBail}" style="color: #555;">${lienBail}</a>
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 11px; color: #aaa;">
          Gautier Lictevout — 430 rue du Blocus, 59710 Mérignies
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, status: newStatus });
}
