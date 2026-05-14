import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // Deux queries séparées pour éviter les problèmes d'include avec libsql
    const inventaires = await prisma.inventaire.findMany({
      include: { appartement: true },
    });

    const edls = await prisma.etatDesLieux.findMany({
      select: { id: true, inventaireId: true, type: true, status: true, date: true },
      orderBy: { createdAt: "asc" },
    });

    // Associer les EDL à leur inventaire
    const result = inventaires.map((inv) => ({
      ...inv,
      etatsDesLieux: edls.filter((e) => e.inventaireId === inv.id),
    }));

    // Trier par étage (null en dernier)
    result.sort((a, b) => (a.appartement.etage ?? 999) - (b.appartement.etage ?? 999));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/inventaires error:", err);
    return NextResponse.json({ error: "Erreur serveur", detail: String(err) }, { status: 500 });
  }
}
