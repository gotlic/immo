import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const edl = await prisma.etatDesLieux.findUnique({
    where: { id: parseInt(id) },
    include: { inventaire: { include: { appartement: true } } },
  });
  if (!edl) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  if (!edl.locataireEmail) return NextResponse.json({ error: "Email locataire manquant" }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/edl/${edl.token}`;
  const typeLabel = edl.type === "entree" ? "d'entrée" : "de sortie";
  const appart = edl.inventaire.appartement;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"Gestion locative" <${process.env.SMTP_USER}>`,
    to: edl.locataireEmail,
    subject: `État des lieux ${typeLabel} — ${appart.titre}`,
    html: `
      <p>Bonjour${edl.locataireNom ? ` ${edl.locataireNom}` : ""},</p>
      <p>Votre état des lieux ${typeLabel} pour le logement <strong>${appart.titre}</strong> est disponible.</p>
      <p>Veuillez le consulter et le signer en cliquant sur le lien ci-dessous :</p>
      <p><a href="${link}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Consulter et signer l'état des lieux</a></p>
      <p style="color:#999;font-size:12px;">Ce lien est personnel. La signature sera authentifiée par un code envoyé à cette adresse email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
