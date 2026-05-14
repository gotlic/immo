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
    orderBy: { appartement: { etage: "asc" } },
  });

  return NextResponse.json(inventaires);
}
