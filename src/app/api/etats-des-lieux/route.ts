import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const edls = await prisma.etatDesLieux.findMany({
    include: { inventaire: { include: { appartement: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(edls);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const data = await req.json();
  const { inventaireId, type, locataireNom, locataireEmail } = data;

  const inventaire = await prisma.inventaire.findUnique({ where: { id: inventaireId } });
  if (!inventaire) return NextResponse.json({ error: "Inventaire introuvable" }, { status: 404 });

  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const edl = await prisma.etatDesLieux.create({
    data: {
      token: randomUUID(),
      inventaireId,
      type,
      date,
      lignes: inventaire.lignes,
      locataireNom: locataireNom || null,
      locataireEmail: locataireEmail || null,
    },
  });

  return NextResponse.json(edl, { status: 201 });
}
