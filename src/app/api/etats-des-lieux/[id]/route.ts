import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const edl = await prisma.etatDesLieux.findUnique({
    where: { id: parseInt(id) },
    include: { inventaire: { include: { appartement: true } } },
  });
  if (!edl) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(edl);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  const updated = await prisma.etatDesLieux.update({
    where: { id: parseInt(id) },
    data: {
      lignes: data.lignes ?? undefined,
      photos: data.photos ?? undefined,
      remarqueCuisine: data.remarqueCuisine ?? undefined,
      remarqueSDB: data.remarqueSDB ?? undefined,
      remarquePiece: data.remarquePiece ?? undefined,
      remarqueGeneral: data.remarqueGeneral ?? undefined,
      locataireNom: data.locataireNom ?? undefined,
      locataireEmail: data.locataireEmail ?? undefined,
      date: data.date ?? undefined,
      updatedAt: new Date(),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await prisma.etatDesLieux.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
