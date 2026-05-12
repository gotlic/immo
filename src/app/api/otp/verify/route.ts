import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashOtpCode } from "@/lib/otp";

/**
 * POST /api/otp/verify
 *
 * Vérifie le code OTP saisi par l'utilisateur.
 * Marque le token de session comme vérifié.
 *
 * Body: { sessionToken: string, code: string }
 * Response: { ok: true }
 */
export async function POST(req: NextRequest) {
  let body: { sessionToken?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { sessionToken, code } = body;
  if (!sessionToken || !code) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const otp = await prisma.signatureOtp.findUnique({ where: { sessionToken } });

  if (!otp) {
    return NextResponse.json({ error: "Session invalide ou expirée." }, { status: 400 });
  }
  if (otp.verifiedAt) {
    return NextResponse.json({ error: "Ce code a déjà été utilisé." }, { status: 400 });
  }
  if (new Date() > otp.expiresAt) {
    return NextResponse.json(
      { error: "Code expiré. Veuillez en demander un nouveau." },
      { status: 400 }
    );
  }
  if (otp.codeHash !== hashOtpCode(code.trim())) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
  }

  await prisma.signatureOtp.update({
    where: { sessionToken },
    data: { verifiedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
