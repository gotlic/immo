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
  if (bail.status !== "signed_both") {
    return NextResponse.json({ error: "Le bail n'est pas encore signé par les deux parties." }, { status: 409 });
  }
  if (!bail.mailLocataire) {
    return NextResponse.json({ error: "Email locataire manquant." }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const lienBail = `${baseUrl}/bail/${bail.token}`;
  const appart = bail.appartement;
  const adresseAppart = [appart.adresse, appart.ville].filter(Boolean).join(", ") || appart.titre;

  await sendMail({
    to: bail.mailLocataire,
    subject: `Votre bail signé — ${adresseAppart}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #1a1a1a;">
        <h2 style="color: #1a1a1a;">Votre contrat de location est prêt</h2>
        <p>Bonjour ${bail.prenomNom ?? ""},</p>
        <p>
          Votre contrat de location pour <strong>${adresseAppart}</strong> a été signé par les deux parties.
          Vous pouvez désormais consulter et télécharger le document complet (bail + annexes) en cliquant sur le lien ci-dessous :
        </p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${lienBail}"
            style="background: #1a1a1a; color: white; padding: 14px 28px; border-radius: 8px;
                   text-decoration: none; font-weight: bold; font-size: 15px;">
            📄 Consulter et télécharger mon bail →
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">
          Pour sauvegarder le document en PDF, ouvrez le lien dans votre navigateur puis utilisez
          <strong>Fichier → Imprimer → Enregistrer en PDF</strong>.
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

  return NextResponse.json({ success: true });
}
