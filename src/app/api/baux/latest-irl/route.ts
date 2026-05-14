import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const bail = await prisma.bail.findFirst({
    where: { irlTrimestre: { not: null }, irlValeur: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { irlTrimestre: true, irlValeur: true },
  });

  return NextResponse.json(bail ?? { irlTrimestre: null, irlValeur: null });
}
