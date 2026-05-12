import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import {
  generateOtpCode,
  hashOtpCode,
  generateSessionToken,
  maskEmail,
  buildOtpEmailHtml,
} from "@/lib/otp";

/**
 * POST /api/otp/send
 *
 * Envoie un code OTP à 6 chiffres par email au signataire.
 * Réutilisable pour tout type de document.
 *
 * Body: {
 *   documentType: "bail" | "caution"
 *   token: string          // bail.token  ou  bail.garantToken
 *   signerRole: "locataire" | "garant"
 * }
 *
 * Response: { sessionToken: string, maskedEmail: string }
 */
export async function POST(req: NextRequest) {
  let body: { documentType?: string; token?: string; signerRole?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { documentType, token, signerRole } = body;
  if (!documentType || !token || !signerRole) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  // Résoudre le bail et l'email selon le type
  let bail: { id: number; mailLocataire: string | null; garantEmail: string | null } | null = null;
  let email: string | null = null;

  if (documentType === "bail") {
    bail = await prisma.bail.findUnique({
      where: { token },
      select: { id: true, mailLocataire: true, garantEmail: true },
    });
    email = bail?.mailLocataire ?? null;
  } else if (documentType === "caution") {
    bail = await prisma.bail.findFirst({
      where: { garantToken: token },
      select: { id: true, mailLocataire: true, garantEmail: true },
    });
    email = bail?.garantEmail ?? null;
  } else {
    return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
  }

  if (!bail) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }
  if (!email) {
    return NextResponse.json(
      { error: "Aucun email associé à ce signataire. Vérifiez que vos coordonnées ont bien été enregistrées." },
      { status: 400 }
    );
  }

  const code = generateOtpCode();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.signatureOtp.create({
    data: {
      sessionToken,
      documentType,
      bailId: bail.id,
      signerRole,
      email,
      codeHash: hashOtpCode(code),
      expiresAt,
    },
  });

  try {
    await sendMail({
      to: email,
      subject: `${code} — votre code de signature`,
      html: buildOtpEmailHtml(code, signerRole),
    });
  } catch (err) {
    console.error("[otp/send] sendMail failed:", err);
    return NextResponse.json({ error: "Échec de l'envoi de l'email. Veuillez réessayer." }, { status: 500 });
  }

  return NextResponse.json({ sessionToken, maskedEmail: maskEmail(email) });
}
