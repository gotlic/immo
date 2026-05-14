import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const baux = await prisma.bail.findMany({
      include: { appartement: true },
      orderBy: { createdAt: "desc" },
    });

    const inventaires = await prisma.inventaire.findMany({
      select: { id: true, appartementId: true },
    });

    const edls = await prisma.etatDesLieux.findMany({
      select: { id: true, inventaireId: true, type: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Map appartementId → inventaireId
    const invByAppart = new Map<number, number>();
    for (const inv of inventaires) invByAppart.set(inv.appartementId, inv.id);

    // Map inventaireId → EDLs[]
    const edlByInv = new Map<number, typeof edls>();
    for (const edl of edls) {
      if (!edlByInv.has(edl.inventaireId)) edlByInv.set(edl.inventaireId, []);
      edlByInv.get(edl.inventaireId)!.push(edl);
    }

    const result = baux.map((bail) => {
      const invId = invByAppart.get(bail.appartementId) ?? null;
      const edlsForAppart = invId ? (edlByInv.get(invId) ?? []) : [];
      const edlEntree = edlsForAppart.filter((e) => e.type === "entree");
      const edlSortie = edlsForAppart.filter((e) => e.type === "sortie");
      return {
        ...bail,
        inventaireId: invId,
        edlEntree: edlEntree[edlEntree.length - 1] ?? null,
        edlSortie: edlSortie[edlSortie.length - 1] ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/locataires error:", err);
    return NextResponse.json({ error: "Erreur serveur", detail: String(err) }, { status: 500 });
  }
}
