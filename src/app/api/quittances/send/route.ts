import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { bailId, moisDebut, moisFin } = await req.json();
  if (!bailId || !moisDebut) {
    return NextResponse.json({ error: "bailId et moisDebut requis" }, { status: 400 });
  }

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    select: {
      token: true,
      prenomNom: true,
      mailLocataire: true,
      emailInvitation: true,
      appartement: { select: { adresse: true, ville: true, titre: true } },
    },
  });

  if (!bail) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

  const email = bail.mailLocataire ?? bail.emailInvitation;
  if (!email) return NextResponse.json({ error: "Email locataire manquant" }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const lienQuittance = moisFin && moisFin !== moisDebut
    ? `${baseUrl}/quittance/${bail.token}?moisDebut=${moisDebut}&moisFin=${moisFin}`
    : `${baseUrl}/quittance/${bail.token}?moisDebut=${moisDebut}`;

  // Format months for the subject line
  const moisLabel = formatMoisLabel(moisDebut, moisFin);
  const appart = bail.appartement;
  const adresseAppart = [appart.adresse, appart.ville].filter(Boolean).join(", ") || appart.titre;
  const prenom = bail.prenomNom ? bail.prenomNom.split(" ")[0] : "";

  await sendMail({
    to: email,
    subject: `Quittance de loyer — ${moisLabel} — ${adresseAppart}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #1a1a1a;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Votre quittance de loyer</h2>
        <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
        <p>
          Veuillez trouver ci-dessous votre quittance de loyer pour <strong>${moisLabel}</strong>,
          concernant le logement situé au <strong>${adresseAppart}</strong>.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${lienQuittance}"
            style="background: #1a1a1a; color: white; padding: 14px 28px; border-radius: 8px;
                   text-decoration: none; font-weight: bold; font-size: 15px;">
            📄 Télécharger ma quittance de loyer
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">
          Pour enregistrer la quittance en PDF : ouvrez le lien ci-dessus, puis utilisez
          <strong>Fichier → Imprimer → Enregistrer en PDF</strong>.
        </p>
        <p style="font-size: 12px; color: #999;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
          <a href="${lienQuittance}" style="color: #555;">${lienQuittance}</a>
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

function formatMoisLabel(moisDebut: string, moisFin?: string | null): string {
  const debut = formatMoisFr(moisDebut);
  if (!moisFin || moisFin === moisDebut) return debut;
  return `${debut} à ${formatMoisFr(moisFin)}`;
}

function formatMoisFr(mois: string): string {
  const [year, month] = mois.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
