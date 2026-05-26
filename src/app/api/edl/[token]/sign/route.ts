import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { sendMail } from "@/lib/mailer";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const { sessionToken, code, signatureUrl } = await req.json();

  const edl = await prisma.etatDesLieux.findUnique({
    where: { token },
    include: { inventaire: { include: { appartement: true } } },
  });
  if (!edl) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  if (edl.status === "signed_both") return NextResponse.json({ error: "Déjà signé" }, { status: 400 });

  // Vérifier OTP
  const otp = await prisma.etatDesLieuxOtp.findUnique({ where: { sessionToken } });
  if (!otp || otp.verifiedAt || otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code expiré ou invalide" }, { status: 400 });
  }
  const codeHash = createHash("sha256").update(code).digest("hex");
  if (codeHash !== otp.codeHash) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
  }

  await prisma.etatDesLieuxOtp.update({ where: { sessionToken }, data: { verifiedAt: new Date() } });

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  const updated = await prisma.etatDesLieux.update({
    where: { token },
    data: {
      signatureLocataire: signatureUrl,
      signatureLocataireAt: new Date().toISOString(),
      signatureLocataireIp: ip,
      status: "signed_both",
      updatedAt: new Date(),
    },
    include: { inventaire: { include: { appartement: true } } },
  });

  // Si EDL de sortie : mettre à jour l'inventaire de l'appartement avec les lignes de cet EDL
  // Cela servira de base pour l'état des lieux d'entrée du prochain locataire.
  if (edl.type === "sortie") {
    await prisma.inventaire.update({
      where: { id: edl.inventaireId },
      data: { lignes: edl.lignes },
    });
  }

  // Envoyer confirmation au locataire
  if (edl.locataireEmail) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const viewLink = `${baseUrl}/edl/${token}`;
    const typeLabel = edl.type === "entree" ? "d'entrée" : "de sortie";

    await sendMail({
      to: edl.locataireEmail,
      subject: `État des lieux ${typeLabel} signé — ${edl.inventaire.appartement.titre}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a1a1a;">
          <p>Bonjour${edl.locataireNom ? ` ${edl.locataireNom}` : ""},</p>
          <p>L'état des lieux ${typeLabel} a bien été signé par les deux parties.</p>
          <p>Vous pouvez le consulter à tout moment en cliquant ci-dessous :</p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${viewLink}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">
              Consulter l'état des lieux
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:11px;color:#aaa;">Gautier Lictevout — 430 rue du Blocus, 59710 Mérignies</p>
        </div>
      `,
    });
  }

  return NextResponse.json(updated);
}
