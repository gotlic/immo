import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const appartements = await prisma.appartement.findMany({
    include: { photos: { orderBy: { ordre: "asc" } }, videos: true },
    orderBy: [{ etage: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(appartements);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const data = await req.json();
  const appartement = await prisma.appartement.create({
    data: {
      titre: data.titre,
      description: data.description,
      surface: parseFloat(data.surface),
      nbPieces: parseInt(data.nbPieces),
      etage: data.etage ? parseInt(data.etage) : null,
      loyer: parseFloat(data.loyer),
      montantCharges: data.montantCharges ? parseFloat(data.montantCharges) : null,
      detailCharges: data.detailCharges || null,
      dpeClasse: data.dpeClasse,
      dpePdf: data.dpePdf,
      disponible: data.disponible ?? true,
      specificites: data.specificites,
      adresse: data.adresse,
      ville: data.ville,
      typeBail: data.typeBail ?? "meuble",
      typeChauffage: data.typeChauffage || null,
      courExtVegetalisee: data.courExtVegetalisee ?? false,
      loyerPrecedentLocataire: data.loyerPrecedentLocataire ? parseFloat(data.loyerPrecedentLocataire) : null,
      coutEnergMensuel: data.coutEnergMensuel ? parseFloat(data.coutEnergMensuel) : null,
      pdl: data.pdl || null,
    },
  });
  return NextResponse.json(appartement, { status: 201 });
}
