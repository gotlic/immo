import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const bailId = parseInt(id);
  if (isNaN(bailId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const bail = await prisma.bail.findUnique({
      where: { id: bailId },
      include: { appartement: true },
    });
    if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // Récupérer l'inventaire + EDL de l'appartement
    const inventaire = await prisma.inventaire.findUnique({
      where: { appartementId: bail.appartementId },
      select: { id: true },
    });

    const edls = inventaire
      ? await prisma.etatDesLieux.findMany({
          where: { inventaireId: inventaire.id },
          select: { id: true, type: true, status: true, date: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const edlEntree = edls.filter((e) => e.type === "entree").at(-1) ?? null;
    const edlSortie = edls.filter((e) => e.type === "sortie").at(-1) ?? null;

    const paiements = await prisma.paiement.findMany({
      where: { bailId },
      orderBy: { mois: "desc" },
    });

    return NextResponse.json({ ...bail, inventaireId: inventaire?.id ?? null, edlEntree, edlSortie, paiements });
  } catch (err) {
    console.error("GET /api/locataires/[id] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
