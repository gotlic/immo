import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appartement = await prisma.appartement.findUnique({
    where: { id: parseInt(id) },
    include: { photos: { orderBy: { ordre: "asc" } }, videos: true },
  });
  if (!appartement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(appartement);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  const appartement = await prisma.appartement.update({
    where: { id: parseInt(id) },
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
      typeChauffage: data.typeChauffage || null,
      courExtVegetalisee: data.courExtVegetalisee ?? false,
      loyerPrecedentLocataire: data.loyerPrecedentLocataire ? parseFloat(data.loyerPrecedentLocataire) : null,
      coutEnergMensuel: data.coutEnergMensuel ? parseFloat(data.coutEnergMensuel) : null,
    },
  });
  return NextResponse.json(appartement);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await prisma.appartement.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
