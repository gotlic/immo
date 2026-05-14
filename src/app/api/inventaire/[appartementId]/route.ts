import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ appartementId: string }> };

// ── GET : lecture publique (FO) ou admin (BO) ─────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { appartementId } = await params;
  const id = parseInt(appartementId);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const inventaire = await prisma.inventaire.findUnique({
    where: { appartementId: id },
    include: { appartement: true },
  });
  if (!inventaire) return NextResponse.json(null);

  return NextResponse.json({
    ...inventaire,
    lignes: JSON.parse(inventaire.lignes ?? "[]"),
  });
}

// ── PUT : création ou mise à jour (admin uniquement) ──────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { appartementId } = await params;
  const id = parseInt(appartementId);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const data = await req.json();

    const inventaire = await prisma.inventaire.upsert({
      where: { appartementId: id },
      update: {
        dateEntree: data.dateEntree ?? null,
        lignes: JSON.stringify(data.lignes ?? []),
        remarqueCuisine: data.remarqueCuisine ?? null,
        remarqueSDB: data.remarqueSDB ?? null,
        remarquePiece: data.remarquePiece ?? null,
        remarqueGeneral: data.remarqueGeneral ?? null,
      },
      create: {
        appartementId: id,
        dateEntree: data.dateEntree ?? null,
        lignes: JSON.stringify(data.lignes ?? []),
        remarqueCuisine: data.remarqueCuisine ?? null,
        remarqueSDB: data.remarqueSDB ?? null,
        remarquePiece: data.remarquePiece ?? null,
        remarqueGeneral: data.remarqueGeneral ?? null,
      },
    });

    return NextResponse.json({ ...inventaire, lignes: JSON.parse(inventaire.lignes ?? "[]") });
  } catch (err) {
    console.error("[PUT /api/inventaire]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
