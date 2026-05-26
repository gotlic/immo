import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomInt, createHash, randomUUID } from "crypto";
import { sendMail } from "@/lib/mailer";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const edl = await prisma.etatDesLieux.findUnique({ where: { token } });
  if (!edl) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  if (!edl.locataireEmail) return NextResponse.json({ error: "Email locataire manquant" }, { status: 400 });

  const code = String(randomInt(100000, 999999));
  const codeHash = createHash("sha256").update(code).digest("hex");
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.etatDesLieuxOtp.create({
    data: { sessionToken, etatDesLieuxId: edl.id, email: edl.locataireEmail, codeHash, expiresAt },
  });

  await sendMail({
    to: edl.locataireEmail,
    subject: "Code de signature — État des lieux",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a;">
        <p>Votre code de signature pour l'état des lieux :</p>
        <p style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1a1a1a;text-align:center;padding:16px 0;">${code}</p>
        <p style="color:#999;font-size:12px;">Ce code expire dans 10 minutes. Ne le communiquez à personne.</p>
      </div>
    `,
  });

  return NextResponse.json({ sessionToken });
}
