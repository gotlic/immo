import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import nodemailer from "nodemailer";

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

  // Envoyer confirmation au locataire
  if (edl.locataireEmail) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const viewLink = `${baseUrl}/edl/${token}`;
    const typeLabel = edl.type === "entree" ? "d'entrée" : "de sortie";

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Gestion locative" <${process.env.SMTP_USER}>`,
      to: edl.locataireEmail,
      subject: `État des lieux ${typeLabel} signé — ${edl.inventaire.appartement.titre}`,
      html: `
        <p>Bonjour${edl.locataireNom ? ` ${edl.locataireNom}` : ""},</p>
        <p>L'état des lieux ${typeLabel} a bien été signé par les deux parties.</p>
        <p>Vous pouvez le consulter à tout moment en cliquant ci-dessous :</p>
        <p><a href="${viewLink}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Consulter l'état des lieux</a></p>
      `,
    });
  }

  return NextResponse.json(updated);
}
