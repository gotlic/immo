import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

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

  const email = bail.emailInvitation ?? bail.mailLocataire;
  if (!email) return NextResponse.json({ error: "Email locataire manquant." }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const lienBail = `${baseUrl}/bail/${bail.token}`;
  const appart = bail.appartement;
  const adresseAppart = [appart.adresse, appart.ville].filter(Boolean).join(", ") || appart.titre;

  await sendMail({
    to: email,
    subject: `Contrat de location — ${adresseAppart}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #1a1a1a;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Votre contrat de location</h2>
        <p style="color: #555; font-size: 14px; margin-top: 0;">${adresseAppart}</p>

        <p style="margin-top: 24px;">Bonjour,</p>
        <p>
          Suite à notre échange, votre contrat de location est prêt.
          Cliquez sur le bouton ci-dessous pour renseigner vos informations et signer électroniquement le bail :
        </p>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${lienBail}"
            style="display: inline-block; background: #1a1a1a; color: #ffffff;
                   padding: 14px 32px; border-radius: 8px; text-decoration: none;
                   font-weight: bold; font-size: 15px; letter-spacing: 0.01em;">
            Remplir et signer mon bail →
          </a>
        </p>

        <p style="font-size: 13px; color: #555;">Ce formulaire vous permettra de :</p>
        <ul style="font-size: 13px; color: #555; padding-left: 20px; line-height: 1.8;">
          <li>Renseigner vos coordonnées${bail.pasDeGarant ? "" : " et celles de votre garant"}</li>
          <li>Lire l'intégralité du contrat de location</li>
          <li>Le signer électroniquement</li>
        </ul>

        <p style="font-size: 13px; color: #555; margin-top: 20px;">
          N'hésitez pas à me contacter pour toute question.
        </p>
        <p style="font-size: 13px; color: #555;">
          Cordialement,<br/>
          Gautier Lictevout<br/>
          06 83 97 48 72
        </p>

        <hr style="margin: 28px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 11px; color: #aaa;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
          <a href="${lienBail}" style="color: #999;">${lienBail}</a>
        </p>
        <p style="font-size: 11px; color: #aaa;">
          Gautier Lictevout — 430 rue du Blocus, 59710 Mérignies
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
