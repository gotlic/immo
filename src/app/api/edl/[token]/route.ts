import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const edl = await prisma.etatDesLieux.findUnique({
    where: { token },
    include: { inventaire: { include: { appartement: true } } },
  });
  if (!edl) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(edl);
}
