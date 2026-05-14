import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { signatureUrl } = await req.json();

  const edl = await prisma.etatDesLieux.update({
    where: { id: parseInt(id) },
    data: {
      signatureBailleur: signatureUrl,
      signatureBailleurAt: new Date().toISOString(),
      status: "signed_bailleur",
      updatedAt: new Date(),
    },
    include: { inventaire: { include: { appartement: true } } },
  });
  return NextResponse.json(edl);
}
