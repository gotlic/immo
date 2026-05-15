import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const paiements = await prisma.paiement.findMany({
    include: {
      bail: {
        select: {
          id: true,
          prenomNom: true,
          mailLocataire: true,
          dateDebut: true,
          appartement: { select: { id: true, titre: true, loyer: true, montantCharges: true } },
        },
      },
    },
    orderBy: [{ mois: "desc" }, { bailId: "asc" }],
  });
  return NextResponse.json(paiements);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { bailId, mois, montant, statut, datePaiement, note } = body;
  const paiement = await prisma.paiement.create({
    data: { bailId, mois, montant, statut: statut ?? "attendu", datePaiement, note },
  });
  return NextResponse.json(paiement, { status: 201 });
}
