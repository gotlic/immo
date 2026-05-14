import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const inventaires = await prisma.inventaire.findMany({
    include: {
      appartement: true,
      etatsDesLieux: {
        orderBy: { createdAt: "asc" },
        select: { id: true, type: true, status: true, date: true },
      },
    },
  });

  // Trier par étage (null en dernier)
  inventaires.sort((a, b) => {
    const ea = a.appartement.etage ?? 999;
    const eb = b.appartement.etage ?? 999;
    return ea - eb;
  });

  return NextResponse.json(inventaires);
}
