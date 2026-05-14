import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const bail = await prisma.bail.findUnique({
    where: { id: parseInt(id) },
    include: {
      appartement: {
        include: { inventaire: true },
      },
    },
  });
  if (!bail) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(bail);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  // Champs autorisés à patcher
  const allowed = [
    "archived", "prenomNom", "dateNaissance", "villeNaissance", "departementNaissance",
    "adresseLocataire", "tel", "mailLocataire", "dateDebut",
    "irlTrimestre", "irlValeur", "loyerReference", "loyerReferenceMaj",
    "garantCivilite", "garantPrenomNom", "garantDateNaissance", "garantAdresse", "garantEmail",
  ];
  const patch = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );

  const bail = await prisma.bail.update({
    where: { id: parseInt(id) },
    data: patch,
  });
  return NextResponse.json(bail);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await prisma.bail.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
