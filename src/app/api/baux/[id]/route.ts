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

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await prisma.bail.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
