import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { signature } = await req.json();

  const updated = await prisma.bail.update({
    where: { id: parseInt(id) },
    data: {
      signatureBailleur: signature,
      signatureBailleurAt: new Date().toISOString(),
      status: "signed_both",
    },
  });

  return NextResponse.json(updated);
}
