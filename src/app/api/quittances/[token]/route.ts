import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const moisDebut = searchParams.get("moisDebut");
  const moisFin = searchParams.get("moisFin");

  const bail = await prisma.bail.findUnique({
    where: { token },
    select: {
      id: true,
      prenomNom: true,
      adresseLocataire: true,
      mailLocataire: true,
      dateDebut: true,
      signatureBailleur: true,
      appartement: {
        select: {
          titre: true,
          adresse: true,
          ville: true,
          loyer: true,
          montantCharges: true,
        },
      },
    },
  });

  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Fetch paiements for the requested period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paiements: any[] = [];

  if (moisDebut) {
    const rawPaiements = await prisma.paiement.findMany({
      where: {
        bailId: bail.id,
        mois: {
          gte: moisDebut,
          ...(moisFin ? { lte: moisFin } : { lte: moisDebut }),
        },
      },
      orderBy: { mois: "asc" },
    });
    // Return only the fields needed for quittances
    paiements = rawPaiements.map((p) => ({
      mois: p.mois,
      montant: p.montant,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loyerHC: (p as any).loyerHC ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chargesMois: (p as any).chargesMois ?? null,
      statut: p.statut,
      datePaiement: p.datePaiement,
    }));
  }

  return NextResponse.json({ bail, paiements });
}
