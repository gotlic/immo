import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ garantToken: string }> }
) {
  const { garantToken } = await params;
  const bail = await prisma.bail.findFirst({
    where: { garantToken },
    include: {
      appartement: {
        select: {
          titre: true, adresse: true, ville: true, surface: true,
          loyer: true, montantCharges: true,
        },
      },
    },
  });
  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (bail.status !== "info_submitted") {
    return NextResponse.json({ error: "Cet acte a déjà été signé ou n'est pas encore disponible." }, { status: 409 });
  }
  // Inclure le token du bail pour que le garant puisse consulter le bail complet
  return NextResponse.json({ ...bail, bailToken: bail.token });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ garantToken: string }> }
) {
  const { garantToken } = await params;
  const bail = await prisma.bail.findFirst({ where: { garantToken } });
  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (bail.status !== "info_submitted") {
    return NextResponse.json({ error: "Cet acte a déjà été signé." }, { status: 409 });
  }

  const data = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "inconnue";

  const updated = await prisma.bail.update({
    where: { id: bail.id },
    data: {
      signatureCaution: data.signature ?? null,
      signatureCautionAt: data.signature ? new Date().toISOString() : null,
      ipCaution: data.signature ? ip : null,
      garantLieu: data.faitA ?? null,
      status: "caution_signed",
    },
  });

  // Notifier le locataire par email
  if (bail.mailLocataire) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const lienBail = `${baseUrl}/bail/${bail.token}`;
    try {
      await sendMail({
        to: bail.mailLocataire,
        subject: "Votre garant a signé l'acte de cautionnement — vous pouvez signer le bail",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #1a1a1a;">Bonne nouvelle !</h2>
            <p>Bonjour ${bail.prenomNom ?? ""},</p>
            <p>
              <strong>${bail.garantPrenomNom ?? "Votre garant"}</strong> a signé l'acte de cautionnement solidaire.
            </p>
            <p>Vous pouvez maintenant lire le contrat de location dans son intégralité et l'apposer votre signature électronique :</p>
            <p style="text-align: center; margin: 24px 0;">
              <a href="${lienBail}"
                style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Lire et signer le bail →
              </a>
            </p>
            <p style="font-size: 12px; color: #666;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
              <a href="${lienBail}">${lienBail}</a>
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[caution PUT] Email locataire failed:", err);
      // Non-bloquant
    }
  }

  return NextResponse.json(updated);
}
