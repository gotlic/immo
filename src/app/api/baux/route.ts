import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const baux = await prisma.bail.findMany({
    include: { appartement: { select: { titre: true, ville: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(baux);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const data = await req.json();
    const token = randomUUID();

    const appartementId = parseInt(data.appartementId);
    if (isNaN(appartementId)) {
      return NextResponse.json({ error: "appartementId invalide" }, { status: 400 });
    }

    const bail = await prisma.bail.create({
      data: {
        token,
        appartementId,
        emailInvitation: data.emailInvitation || null,
        dateDebut: data.dateDebut || null,
        irlTrimestre: data.irlTrimestre || null,
        irlValeur: data.irlValeur || null,
        loyerReference: data.loyerReference || null,
        loyerReferenceMaj: data.loyerReferenceMaj || null,
        pasDeGarant: data.pasDeGarant === true,
      },
    });

    return NextResponse.json(bail, { status: 201 });
  } catch (err) {
    console.error("[POST /api/baux]", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
